"""
Admin panel routes — gated by get_current_admin, so only an account with
is_admin=True can reach any of these. The first account ever created
becomes admin automatically (see routes_auth.py); an admin can promote or
demote any other account via PATCH /admin/users/{id}/role.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import db_models
from auth import get_current_admin
from database import get_db
from user_data_models import ApplicationOut

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(get_current_admin)])


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    return {
        "total_users": db.query(db_models.User).count(),
        "total_admins": db.query(db_models.User).filter_by(is_admin=True).count(),
        "total_saved_jobs": db.query(db_models.SavedJob).count(),
        "total_applications": db.query(db_models.Application).count(),
        "total_history_entries": db.query(db_models.AnalysisHistoryEntry).count(),
        "applications_by_status": {
            status: db.query(db_models.Application).filter_by(status=status).count()
            for status in ["Interested", "Preparing", "Applied", "Interview", "Rejected", "Offer"]
        },
    }


@router.get("/users")
def list_users(db: Session = Depends(get_db)):
    users = db.query(db_models.User).order_by(db_models.User.created_at.asc()).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "is_admin": u.is_admin,
            "created_at": u.created_at,
            "saved_jobs_count": db.query(db_models.SavedJob).filter_by(user_id=u.id).count(),
            "applications_count": db.query(db_models.Application).filter_by(user_id=u.id).count(),
        }
        for u in users
    ]


@router.patch("/users/{user_id}/role")
def set_user_role(
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

    db.query(db_models.SavedJob).filter_by(user_id=user_id).delete()
    db.query(db_models.AnalysisHistoryEntry).filter_by(user_id=user_id).delete()
    db.query(db_models.Preference).filter_by(user_id=user_id).delete()
    application_ids = [a.id for a in db.query(db_models.Application).filter_by(user_id=user_id).all()]
    if application_ids:
        db.query(db_models.ApplicationEvent).filter(
            db_models.ApplicationEvent.application_id.in_(application_ids)
        ).delete(synchronize_session=False)
        db.query(db_models.Application).filter_by(user_id=user_id).delete()
    db.delete(user)
    db.commit()
    return {"removed": True}


@router.get("/applications", response_model=list[ApplicationOut])
def list_all_applications(db: Session = Depends(get_db)):
    """System-wide view of every tracked application, across all users."""
    return db.query(db_models.Application).order_by(db_models.Application.created_at.desc()).all()
