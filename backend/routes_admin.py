"""
Admin panel routes — gated by get_current_admin, so only an account with
is_admin=True can reach any of these. The first account ever created
becomes admin automatically (see routes_auth.py); an admin can promote or
demote any other account via PATCH /admin/users/{id}/role.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import db_models
from applications_schemas import APPLICATION_STATUSES
from auth import get_current_admin
from database import get_db

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(get_current_admin)])


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    return {
        "total_users": db.query(db_models.User).count(),
        "total_admins": db.query(db_models.User).filter_by(is_admin=True).count(),
        "total_recruiters": db.query(db_models.User).filter_by(role="recruiter").count(),
        "total_candidates": db.query(db_models.User).filter_by(role="candidate").count(),
        "total_jobs": db.query(db_models.Job).count(),
        "total_resumes": db.query(db_models.Resume).count(),
        "total_applications": db.query(db_models.Application).count(),
        "applications_by_status": {
            status: db.query(db_models.Application).filter_by(status=status).count()
            for status in APPLICATION_STATUSES
        },
    }


@router.get("/users")
def list_users(db: Session = Depends(get_db)):
    users = db.query(db_models.User).order_by(db_models.User.created_at.asc()).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "is_admin": u.is_admin,
            "created_at": u.created_at,
            "jobs_count": db.query(db_models.Job).filter_by(recruiter_id=u.id).count() if u.role == "recruiter" else 0,
            "applications_count": db.query(db_models.Application).filter_by(candidate_id=u.id).count() if u.role == "candidate" else 0,
        }
        for u in users
    ]


@router.patch("/users/{user_id}/role")
def set_admin_role(
    user_id: int,
    is_admin: bool,
    admin: db_models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if user_id == admin.id and not is_admin:
        raise HTTPException(status_code=400, detail="You can't remove your own admin access")

    user = db.query(db_models.User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_admin = is_admin
    db.commit()
    return {"id": user.id, "email": user.email, "is_admin": user.is_admin}


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    admin: db_models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="You can't delete your own account here")

    user = db.query(db_models.User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Deleted one ORM object at a time (not a bulk .delete() query) so the
    # relationship cascades on Job/Application/Resume actually fire.
    for job in db.query(db_models.Job).filter_by(recruiter_id=user_id).all():
        db.delete(job)
    for application in db.query(db_models.Application).filter_by(candidate_id=user_id).all():
        db.delete(application)
    for resume in db.query(db_models.Resume).filter_by(candidate_id=user_id).all():
        db.delete(resume)
    db.query(db_models.PasswordResetToken).filter_by(user_id=user_id).delete()
    db.delete(user)
    db.commit()
    return {"removed": True}


@router.get("/applications")
def list_all_applications(db: Session = Depends(get_db)):
    """System-wide view of every application, across all recruiters."""
    apps = db.query(db_models.Application).order_by(db_models.Application.created_at.desc()).all()
    return [
        {
            "id": a.id,
            "job_id": a.job_id,
            "candidate_id": a.candidate_id,
            "match_score": a.match_score,
            "status": a.status,
            "created_at": a.created_at,
        }
        for a in apps
    ]
