"""Deteksi wajah + embedding 512 dimensi (insightface / buffalo_l)."""

from typing import List, Optional

import numpy as np


class FaceEngine:
    def __init__(self, det_size: int = 640):
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
        faces = self.app.get(image)
        if len(faces) != 1:
            return None
        return self._normalize(faces[0].normed_embedding)


def read_image(path_or_bytes) -> Optional["np.ndarray"]:
    import cv2

    if isinstance(path_or_bytes, (bytes, bytearray)):
        buf = np.frombuffer(path_or_bytes, dtype=np.uint8)
        return cv2.imdecode(buf, cv2.IMREAD_COLOR)
    return cv2.imread(path_or_bytes)
