"""Akses Supabase memakai akun admin (bukan service role)."""

from typing import Any, Dict, List, Optional

from supabase import create_client, Client

from .config import Config


class Backend:
    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.client: Client = create_client(cfg.supabase_url, cfg.supabase_anon_key)
        self.user_id: Optional[str] = None
        self.access_token: Optional[str] = None

    # ---------- auth ----------
    def sign_in(self, email: str, password: str) -> str:
        res = self.client.auth.sign_in_with_password({"email": email, "password": password})
        if not res.user:
            raise RuntimeError("Login gagal")
        self.user_id = res.user.id
        self.access_token = res.session.access_token if res.session else None
        return res.user.id

    def token(self) -> str:
        """Access token terbaru (auto-refresh oleh supabase-py)."""
        session = self.client.auth.get_session()
        if session and session.access_token:
            self.access_token = session.access_token
        if not self.access_token:
            raise RuntimeError("Sesi admin belum aktif. Klik Hubungkan lagi.")
        return self.access_token

    # ---------- worker faces ----------
    def pending_faces(self) -> List[Dict[str, Any]]:
        res = (
            self.client.table("worker_faces")
            .select("id,worker_id,personal_number,reference_photo_url,status")
            .eq("status", "pending")
            .execute()
        )
        return res.data or []

    def set_face_indexed(self, face_id: str, embedding: List[float]) -> None:
        self.client.table("worker_faces").update(
            {"embedding": embedding, "status": "indexed", "note": None}
        ).eq("id", face_id).execute()

    def set_face_failed(self, face_id: str, note: str) -> None:
        self.client.table("worker_faces").update({"status": "failed", "note": note}).eq(
            "id", face_id
        ).execute()

    def indexed_count(self) -> int:
        res = (
            self.client.table("worker_faces")
            .select("id", count="exact")
            .eq("status", "indexed")
            .execute()
        )
        return res.count or 0

    def match(self, embedding: List[float]) -> List[Dict[str, Any]]:
        res = self.client.rpc(
            "match_worker_faces",
            {
                "query_embedding": embedding,
                "match_threshold": float(self.cfg.match_threshold),
                "match_count": int(self.cfg.match_count),
            },
        ).execute()
        return res.data or []

    # ---------- events ----------
    def list_events(self) -> List[Dict[str, Any]]:
        res = (
            self.client.table("events")
            .select("id,nama_event,tanggal_mulai,drive_folder_id")
            .order("tanggal_mulai", desc=True)
            .limit(200)
            .execute()
        )
        return res.data or []

    def upsert_event(
        self, nama: str, deskripsi: str, tanggal: str, event_id: Optional[str] = None
    ) -> Dict[str, Any]:
        payload = {"nama_event": nama, "deskripsi": deskripsi or None, "tanggal_mulai": tanggal}
        if event_id:
            res = self.client.table("events").update(payload).eq("id", event_id).select("*").execute()
        else:
            res = self.client.table("events").insert(payload).execute()
        return (res.data or [{}])[0]

    def set_event_folder(self, event_id: str, folder_id: str) -> None:
        self.client.table("events").update({"drive_folder_id": folder_id}).eq(
            "id", event_id
        ).execute()

    def photo_exists(self, drive_file_id: str) -> bool:
        res = (
            self.client.table("event_photos")
            .select("id")
            .eq("drive_file_id", drive_file_id)
            .limit(1)
            .execute()
        )
        return bool(res.data)

    def insert_photo(
        self,
        event_id: str,
        drive_file_id: str,
        drive_view_link: str,
        file_name: str,
        matched_worker_ids: List[str],
    ) -> None:
        self.client.table("event_photos").insert(
            {
                "event_id": event_id,
                "drive_file_id": drive_file_id,
                "drive_view_link": drive_view_link,
                "file_name": file_name,
                "matched_worker_ids": matched_worker_ids,
                "uploaded_by": self.user_id,
            }
        ).execute()
