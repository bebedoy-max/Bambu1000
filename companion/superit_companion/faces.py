"""Deteksi wajah + embedding 512 dimensi (insightface / buffalo_l)."""

import os
import sys
from typing import List, Optional

import numpy as np


def _safe_streams() -> None:
    """pythonw.exe (Windows) membuat stdout/stderr = None; insightface menulis
    progres unduhan model ke sana dan gagal dengan NoneType.write."""
    if sys.stdout is not None and sys.stderr is not None:
        return
    try:
        log_dir = os.path.join(os.path.expanduser("~"), ".superit-event-uploader-logs")
        os.makedirs(log_dir, exist_ok=True)
        stream = open(os.path.join(log_dir, "runtime.log"), "a", encoding="utf-8", buffering=1)
    except OSError:
        stream = open(os.devnull, "w", encoding="utf-8")
    if sys.stdout is None:
        sys.stdout = stream
    if sys.stderr is None:
        sys.stderr = stream


class FaceEngine:
    def __init__(self, det_size: int = 640):
        _safe_streams()
        from insightface.app import FaceAnalysis

        self.app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
        self.app.prepare(ctx_id=-1, det_size=(det_size, det_size))

    @staticmethod
    def _normalize(vec: np.ndarray) -> List[float]:
        norm = np.linalg.norm(vec)
        if norm == 0:
            return vec.astype(float).tolist()
        return (vec / norm).astype(float).tolist()

    def embeddings(self, image: np.ndarray) -> List[List[float]]:
        """Semua wajah pada satu gambar."""
        faces = self.app.get(image)
        return [self._normalize(f.normed_embedding) for f in faces]

    def single_embedding(self, image: np.ndarray) -> Optional[List[float]]:
        """Tepat satu wajah, jika tidak -> None."""
        res = self.single_face(image)
        return res[0] if res else None

    def single_face(self, image: np.ndarray):
        """(embedding, kualitas 0..1) untuk foto berisi tepat satu wajah."""
        faces = self.app.get(image)
        if len(faces) != 1:
            return None
        face = faces[0]
        score = float(getattr(face, "det_score", 0.0) or 0.0)
        return self._normalize(face.normed_embedding), max(0.0, min(1.0, score))


def read_image(path_or_bytes) -> Optional["np.ndarray"]:
    import cv2

    if isinstance(path_or_bytes, (bytes, bytearray)):
        buf = np.frombuffer(path_or_bytes, dtype=np.uint8)
        return cv2.imdecode(buf, cv2.IMREAD_COLOR)
    return cv2.imread(path_or_bytes)
