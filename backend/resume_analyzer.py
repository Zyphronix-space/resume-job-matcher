"""
Core resume/job-description analysis: PDF text extraction, the
sentence-transformer model, semantic similarity, and taxonomy skill
detection.

This is the one ML/NLP core used everywhere in the app — the single-job
/analyze endpoint and internship matching (job_matcher.py) both call the
same functions here. There is no separate "smarter" model for internship
matching; it's the same explainable pipeline applied to more than one job
description at a time.
"""

import io
import os
import re
import threading

import httpx
import numpy as np
import pdfplumber
from fastapi import HTTPException

from resume_sections import segment_resume, structure_score
from skills_taxonomy import SKILLS

# all-MiniLM-L6-v2 run through ONNX Runtime instead of sentence-transformers:
# same weights, same tokenizer, same mean-pooling + L2-normalize head, so
# scores match the torch version — but without the ~1 GB torch dependency,
# which doesn't fit in a Vercel function (500 MB limit).
#
# The model files (~90 MB) are not committed. They're read from
# EMBEDDING_MODEL_DIR (default ./model) if present, otherwise downloaded
# once from Hugging Face into /tmp — which persists for the lifetime of a
# warm serverless instance — and loaded lazily on first use, so routes that
# never embed anything (auth, jobs CRUD, ...) don't pay for it on cold start.
_MODEL_URL = "https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/"
_MODEL_FILES = {"model.onnx": "onnx/model.onnx", "tokenizer.json": "tokenizer.json"}
_MAX_SEQ_LENGTH = 256  # sentence-transformers' max_seq_length for this model
_LOCAL_MODEL_DIR = os.environ.get(
    "EMBEDDING_MODEL_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "model")
)
_TMP_MODEL_DIR = os.path.join("/tmp" if os.name != "nt" else os.environ.get("TEMP", "."), "minilm-l6-v2")

_model_lock = threading.Lock()
_session = None
_tokenizer = None


def _model_dir() -> str:
    if all(os.path.exists(os.path.join(_LOCAL_MODEL_DIR, f)) for f in _MODEL_FILES):
        return _LOCAL_MODEL_DIR
    os.makedirs(_TMP_MODEL_DIR, exist_ok=True)
    for local_name, remote_path in _MODEL_FILES.items():
        target = os.path.join(_TMP_MODEL_DIR, local_name)
        if os.path.exists(target):
            continue
        partial = target + ".part"
        with httpx.stream("GET", _MODEL_URL + remote_path, follow_redirects=True, timeout=60) as res:
            res.raise_for_status()
            with open(partial, "wb") as f:
                for chunk in res.iter_bytes(1 << 20):
                    f.write(chunk)
        os.replace(partial, target)
    return _TMP_MODEL_DIR


def _load_model():
    global _session, _tokenizer
    if _session is None:
        with _model_lock:
            if _session is None:
                import onnxruntime
                from tokenizers import Tokenizer

                directory = _model_dir()
                tokenizer = Tokenizer.from_file(os.path.join(directory, "tokenizer.json"))
                tokenizer.enable_truncation(max_length=_MAX_SEQ_LENGTH)
                tokenizer.enable_padding(pad_id=0, pad_token="[PAD]")
                _session = onnxruntime.InferenceSession(
                    os.path.join(directory, "model.onnx"), providers=["CPUExecutionProvider"]
                )
                _tokenizer = tokenizer
    return _session, _tokenizer


def extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            return "\n".join(page.extract_text() or "" for page in pdf.pages)
    except Exception as exc:
        # A malformed/corrupt file (or one that's merely named .pdf) reaches
        # pdfminer as a parse error, not an HTTPException — without this it
        # would propagate past FastAPI's normal error handling and escape
        # without CORS headers, which the browser then misreports as a
        # network failure instead of a normal 4xx response.
        raise HTTPException(status_code=400, detail="Could not read the PDF file") from exc


def find_skills(text: str) -> set[str]:
    text_lower = text.lower()
    found = set()
    for skill in SKILLS:
        pattern = r"(?<![a-z0-9])" + re.escape(skill) + r"(?![a-z0-9])"
        if re.search(pattern, text_lower):
            found.add(skill)
    return found


def embed(text_or_texts):
    """Encodes one string or a list of strings into sentence embeddings in a
    single batched model call — used so matching a resume against many job
    postings doesn't invoke the model once per posting."""
    session, tokenizer = _load_model()
    single = isinstance(text_or_texts, str)
    encodings = tokenizer.encode_batch([text_or_texts] if single else list(text_or_texts))
    input_ids = np.array([e.ids for e in encodings], dtype=np.int64)
    attention_mask = np.array([e.attention_mask for e in encodings], dtype=np.int64)
    inputs = {"input_ids": input_ids, "attention_mask": attention_mask}
    if any(i.name == "token_type_ids" for i in session.get_inputs()):
        inputs["token_type_ids"] = np.zeros_like(input_ids)
    token_embeddings = session.run(None, inputs)[0]

    # Mean pooling over real (non-padding) tokens, then L2 normalization —
    # the same head sentence-transformers applies for this model.
    mask = attention_mask[..., None].astype(np.float32)
    pooled = (token_embeddings * mask).sum(axis=1) / np.clip(mask.sum(axis=1), 1e-9, None)
    pooled /= np.clip(np.linalg.norm(pooled, axis=1, keepdims=True), 1e-12, None)
    return pooled[0] if single else pooled


def score_from_embeddings(embedding_a, embedding_b) -> float:
    a, b = np.asarray(embedding_a), np.asarray(embedding_b)
    score = float(np.dot(a, b) / max(np.linalg.norm(a) * np.linalg.norm(b), 1e-12))
    # cosine similarity is in [-1, 1]; clamp to [0, 1] then scale to a percentage
    return round(max(0.0, min(1.0, score)) * 100, 1)


def semantic_similarity(text_a: str, text_b: str) -> float:
    embeddings = embed([text_a, text_b])
    return score_from_embeddings(embeddings[0], embeddings[1])


def extract_resume_profile(cv_text: str) -> dict:
    """
    Resume-only analysis: everything that does NOT depend on any specific
    job description. Computed once per uploaded CV and reused across every
    job it's matched against (see job_matcher.match_jobs), rather than
    re-parsing the same resume text once per posting.
    """
    detected_sections, cv_section_text, has_contact = segment_resume(cv_text)
    return {
        "cv_skills": find_skills(cv_text),
        "cv_section_text": cv_section_text,
        "resume_sections": {"Contact Information": has_contact, **detected_sections},
        "resume_structure_score": structure_score(detected_sections, has_contact),
    }
