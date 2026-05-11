// 사진 업로드 헬퍼 — Supabase Storage 'photos' bucket으로 업로드.
// - 입력: data URL (base64, canvas 리사이즈 결과) 또는 Blob
// - 출력: Storage path (DB의 photo_paths 칼럼에 저장할 값)
// - 표시: publicUrlFor(path) 로 변환해 <Image source={{uri}} />에 사용
//
// 실패 정책: 한 장이라도 업로드 실패하면 그 사진은 결과에서 빠짐 (빈 자리 없이).
// 메타(별점·태그)만이라도 보존하려는 구버전 localStorage 패턴과 동일 의도.

import { supabase } from './supabase';

const BUCKET = 'photos';

export type PhotoFolder = 'reviews' | 'verifications';

/**
 * data URL (base64) → Blob → Supabase Storage → path 반환.
 * 실패 시 null.
 */
export async function uploadPhoto(
  dataUrl: string,
  folder: PhotoFolder,
): Promise<string | null> {
  if (!dataUrl) return null;
  try {
    const blob = await dataUrlToBlob(dataUrl);
    const ext = mimeToExt(blob.type) ?? 'jpg';
    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(filename, blob, {
      contentType: blob.type || 'image/jpeg',
      upsert: false,
    });
    if (error) {
      if (__DEV__) console.warn('[upload] storage error', error);
      return null;
    }
    return filename;
  } catch (e) {
    if (__DEV__) console.warn('[upload] failed', e);
    return null;
  }
}

/** 여러 dataUrl 동시 업로드 — 실패한 건 결과에서 제외. */
export async function uploadPhotos(
  dataUrls: string[],
  folder: PhotoFolder,
): Promise<string[]> {
  if (!dataUrls?.length) return [];
  const results = await Promise.all(
    dataUrls.map((u) => uploadPhoto(u, folder)),
  );
  return results.filter((p): p is string => !!p);
}

/** Storage path (e.g. "reviews/12345-abc.jpg") → public URL. */
export function publicUrlFor(path: string | null | undefined): string | null {
  if (!path) return null;
  // 이미 절대 URL이면 그대로 (구버전 base64 호환)
  if (path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl ?? null;
}

/** 여러 path → public URL. null은 제외. */
export function publicUrlsFor(paths: string[] | null | undefined): string[] {
  if (!paths?.length) return [];
  return paths.map(publicUrlFor).filter((u): u is string => !!u);
}

/** Storage에서 사진 삭제 (리뷰 삭제 시 cleanup용). 실패해도 throw 안 함. */
export async function deletePhotos(paths: string[]): Promise<void> {
  if (!paths?.length) return;
  // 절대 URL/data URL은 storage 경로 아님 → skip
  const storagePaths = paths.filter(
    (p) => !p.startsWith('data:') && !p.startsWith('http'),
  );
  if (!storagePaths.length) return;
  try {
    await supabase.storage.from(BUCKET).remove(storagePaths);
  } catch (e) {
    if (__DEV__) console.warn('[upload] delete failed', e);
  }
}

// =========================================================
// Internal
// =========================================================

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  // 웹/RN 모두에서 fetch(dataUrl).blob()가 가장 호환성 좋음.
  const res = await fetch(dataUrl);
  return await res.blob();
}

function mimeToExt(mime: string | undefined): string | undefined {
  if (!mime) return undefined;
  const m = mime.toLowerCase();
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
  if (m.includes('png')) return 'png';
  if (m.includes('webp')) return 'webp';
  return undefined;
}
