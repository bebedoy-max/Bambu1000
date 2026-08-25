"""Unggah ke Google Drive lewat web app SuperIT.

Tidak lagi memerlukan client_secret.json: aplikasi desktop mengirim file ke
endpoint web app, dan web app memakai akun Google Drive yang aktif di panel.
"""

import base64
import mimetypes
import os
import time
from typing import Callable, Dict

import requests


class Drive:
    """Jembatan ke endpoint /api/public/companion/upload di web app."""

    def __init__(self, panel_url: str, token_provider: Callable[[], str]):
        self.base = panel_url.rstrip("/")
        self._token = token_provider

    # ---------- status ----------
    def status(self) -> Dict[str, object]:
        res = requests.get(f"{self.base}/api/public/companion/drive-status", timeout=30)
        res.raise_for_status()
        return res.json()

    # ---------- kompatibilitas ----------
    def event_folder(self, event_name: str) -> str:
        """Nama subfolder event; folder sebenarnya dibuat oleh web app."""
        return event_name

    def upload(self, folder_name: str, local_path: str, file_name: str) -> dict:
        mime = mimetypes.guess_type(local_path)[0] or "image/jpeg"
        with open(local_path, "rb") as fh:
            payload = base64.b64encode(fh.read()).decode("ascii")
        body = {
            "subfolder": folder_name,
            "fileName": file_name,
            "mimeType": mime,
            "base64": payload,
        }
        last = ""
        for attempt in range(3):
            res = requests.post(
                f"{self.base}/api/public/companion/upload",
                json=body,
                headers={"Authorization": f"Bearer {self._token()}"},
                timeout=300,
            )
            if res.ok:
                return res.json()
            last = f"[{res.status_code}] {res.text[:300]}"
            if res.status_code in (429, 500, 502, 503) and attempt < 2:
                time.sleep(2 * (attempt + 1))
                continue
            break
        raise RuntimeError(f"Gagal unggah {os.path.basename(local_path)}: {last}")
