import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ALLOWED_ARTWORK_MIME_TYPES,
  ErrorCode,
  MAX_ARTWORK_FILE_SIZE_BYTES,
  MIN_ARTWORK_DIMENSION_PX,
} from '@foka-vote/shared';
import { ApiError, isAbortError, isUnauthorizedError, mediaUrl } from '../services/apiClient';
import { deletePendingPhoto, uploadPendingPhoto, type UploadTarget } from '../services/uploads';
import { errorMessage } from './errorMessage';

export type PhotoUploadStatus = 'queued' | 'uploading' | 'processing' | 'done' | 'error';

export interface PhotoUploadItem {
  key: string;
  /** Null for photos restored from an earlier visit of the form; those are already uploaded. */
  file: File | null;
  previewUrl: string;
  status: PhotoUploadStatus;
  progress: number;
  uploadId: string | null;
  thumbUrl: string | null;
  error: string | null;
  title: string;
  description: string;
}

/** An uploaded photo with its caption, as kept in a draft between pages. */
export interface UploadedPhotoDraft {
  uploadId: string;
  thumbUrl: string;
  title: string;
  description: string;
}

export type RejectedFileReason = 'type' | 'size' | 'limit';

export interface RejectedFile {
  name: string;
  reason: RejectedFileReason;
}

export interface PhotoUploadSummary {
  total: number;
  done: number;
  failed: number;
  /** Byte-weighted progress of all photos, 0-1. */
  fraction: number;
  busy: boolean;
}

interface UsePhotoUploadQueueOptions {
  initialPhotos?: UploadedPhotoDraft[];
  onUnauthorized?: () => void;
}

let nextKey = 0;

function createKey(): string {
  nextKey += 1;
  return `photo-${nextKey}`;
}

function restoredItem(photo: UploadedPhotoDraft): PhotoUploadItem {
  return {
    key: createKey(),
    file: null,
    previewUrl: mediaUrl(photo.thumbUrl),
    status: 'done',
    progress: 1,
    uploadId: photo.uploadId,
    thumbUrl: photo.thumbUrl,
    error: null,
    title: photo.title,
    description: photo.description,
  };
}

function releasePreview(objectUrls: Set<string>, item: PhotoUploadItem): void {
  if (objectUrls.delete(item.previewUrl)) {
    URL.revokeObjectURL(item.previewUrl);
  }
}

function rejectionReason(file: File): RejectedFileReason | null {
  if (!(ALLOWED_ARTWORK_MIME_TYPES as readonly string[]).includes(file.type)) {
    return 'type';
  }
  if (file.size > MAX_ARTWORK_FILE_SIZE_BYTES) {
    return 'size';
  }
  return null;
}

/**
 * Uploads picked photos one at a time in the background, while the form lets the user reorder,
 * caption and remove them. Removed photos are deleted on the server right away.
 */
const usePhotoUploadQueue = (
  target: UploadTarget,
  max: number,
  { initialPhotos = [], onUnauthorized }: UsePhotoUploadQueueOptions = {},
) => {
  const { t } = useTranslation();
  const [items, setItems] = useState<PhotoUploadItem[]>(() => initialPhotos.map(restoredItem));

  // The queue runs outside React's render cycle, so it reads the latest values through refs.
  const itemsRef = useRef(items);
  const targetRef = useRef(target);
  const translateRef = useRef(t);
  const onUnauthorizedRef = useRef(onUnauthorized);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const controllersRef = useRef(new Map<string, AbortController>());
  const objectUrlsRef = useRef(new Set<string>());
  const disposedRef = useRef(false);

  useEffect(() => {
    targetRef.current = target;
    translateRef.current = t;
    onUnauthorizedRef.current = onUnauthorized;
  });

  const commit = useCallback((update: (prev: PhotoUploadItem[]) => PhotoUploadItem[]) => {
    itemsRef.current = update(itemsRef.current);
    setItems(itemsRef.current);
  }, []);

  const patch = useCallback(
    (key: string, changes: Partial<PhotoUploadItem>) => {
      commit((prev) => prev.map((item) => (item.key === key ? { ...item, ...changes } : item)));
    },
    [commit],
  );

  const uploadItem = useCallback(
    async (key: string) => {
      const item = itemsRef.current.find((candidate) => candidate.key === key);
      if (disposedRef.current || !item?.file || item.status !== 'queued') {
        return;
      }

      const uploadTarget = targetRef.current;
      const controller = new AbortController();
      controllersRef.current.set(key, controller);
      patch(key, { status: 'uploading', progress: 0, error: null });

      try {
        const upload = await uploadPendingPhoto(
          uploadTarget,
          item.file,
          (fraction) =>
            patch(
              key,
              fraction >= 1 ? { status: 'processing', progress: 1 } : { progress: fraction },
            ),
          controller.signal,
        );
        if (!itemsRef.current.some((candidate) => candidate.key === key)) {
          // Removed while the server was still processing it.
          void deletePendingPhoto(uploadTarget, upload.id).catch(() => undefined);
          return;
        }
        // The server thumbnail replaces the full-size local preview, which can take a lot of memory.
        releasePreview(objectUrlsRef.current, item);
        patch(key, {
          status: 'done',
          progress: 1,
          uploadId: upload.id,
          thumbUrl: upload.thumbUrl,
          previewUrl: mediaUrl(upload.thumbUrl),
        });
      } catch (err) {
        if (isAbortError(err)) {
          return;
        }
        const translate = translateRef.current;
        const message =
          err instanceof ApiError && err.code === ErrorCode.VALIDATION_FAILED
            ? translate('components.photoUpload.invalidPhoto', {
                minSize: MIN_ARTWORK_DIMENSION_PX,
              })
            : errorMessage(err, translate);
        patch(key, { status: 'error', error: message });
        if (isUnauthorizedError(err)) {
          onUnauthorizedRef.current?.();
        }
      } finally {
        controllersRef.current.delete(key);
      }
    },
    [patch],
  );

  const enqueue = useCallback(
    (key: string) => {
      queueRef.current = queueRef.current.then(() => uploadItem(key));
    },
    [uploadItem],
  );

  const add = useCallback(
    (files: File[]): RejectedFile[] => {
      const rejected: RejectedFile[] = [];
      const accepted: PhotoUploadItem[] = [];
      let free = max - itemsRef.current.length;

      for (const file of files) {
        const reason = free <= 0 ? 'limit' : rejectionReason(file);
        if (reason) {
          rejected.push({ name: file.name, reason });
          continue;
        }
        free -= 1;
        const previewUrl = URL.createObjectURL(file);
        objectUrlsRef.current.add(previewUrl);
        accepted.push({
          key: createKey(),
          file,
          previewUrl,
          status: 'queued',
          progress: 0,
          uploadId: null,
          thumbUrl: null,
          error: null,
          title: '',
          description: '',
        });
      }

      commit((prev) => [...prev, ...accepted]);
      accepted.forEach((item) => enqueue(item.key));
      return rejected;
    },
    [commit, enqueue, max],
  );

  const retry = useCallback(
    (key: string) => {
      patch(key, { status: 'queued', progress: 0, error: null });
      enqueue(key);
    },
    [enqueue, patch],
  );

  const remove = useCallback(
    (key: string) => {
      const item = itemsRef.current.find((candidate) => candidate.key === key);
      if (!item) {
        return;
      }
      commit((prev) => prev.filter((candidate) => candidate.key !== key));
      releasePreview(objectUrlsRef.current, item);

      if (item.status === 'uploading') {
        controllersRef.current.get(key)?.abort();
      } else if (item.uploadId) {
        void deletePendingPhoto(targetRef.current, item.uploadId).catch(() => undefined);
      }
      // A photo in 'processing' is deleted by uploadItem once the server returns its id.
    },
    [commit],
  );

  /** Removes every photo, e.g. when the form is cancelled. */
  const clear = useCallback(async () => {
    const current = itemsRef.current;
    commit(() => []);
    current.forEach((item) => releasePreview(objectUrlsRef.current, item));
    controllersRef.current.forEach((controller) => controller.abort());
    await Promise.allSettled(
      current
        .filter((item) => item.uploadId !== null)
        .map((item) => deletePendingPhoto(targetRef.current, item.uploadId as string)),
    );
  }, [commit]);

  const move = useCallback(
    (key: string, direction: -1 | 1) => {
      commit((prev) => {
        const index = prev.findIndex((item) => item.key === key);
        const swapWith = index + direction;
        if (index < 0 || swapWith < 0 || swapWith >= prev.length) {
          return prev;
        }
        const next = [...prev];
        [next[index], next[swapWith]] = [
          next[swapWith] as PhotoUploadItem,
          next[index] as PhotoUploadItem,
        ];
        return next;
      });
    },
    [commit],
  );

  const update = useCallback(
    (key: string, changes: Partial<Pick<PhotoUploadItem, 'title' | 'description'>>) => {
      patch(key, changes);
    },
    [patch],
  );

  useEffect(() => {
    const controllers = controllersRef.current;
    const objectUrls = objectUrlsRef.current;
    disposedRef.current = false;
    return () => {
      // Queued photos must not start uploading once the form is gone.
      disposedRef.current = true;
      controllers.forEach((controller) => controller.abort());
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.clear();
    };
  }, []);

  const summary = useMemo<PhotoUploadSummary>(() => {
    let loaded = 0;
    let size = 0;
    for (const item of items) {
      const itemSize = item.file?.size ?? 0;
      size += itemSize;
      loaded += item.status === 'done' ? itemSize : itemSize * item.progress;
    }
    const done = items.filter((item) => item.status === 'done').length;
    return {
      total: items.length,
      done,
      failed: items.filter((item) => item.status === 'error').length,
      fraction: size > 0 ? loaded / size : items.length > 0 && done === items.length ? 1 : 0,
      busy: items.some((item) => item.status !== 'done' && item.status !== 'error'),
    };
  }, [items]);

  const uploadedPhotos = useMemo<UploadedPhotoDraft[] | null>(() => {
    if (items.length === 0 || items.some((item) => item.status !== 'done')) {
      return null;
    }
    return items.map((item) => ({
      uploadId: item.uploadId as string,
      thumbUrl: item.thumbUrl as string,
      title: item.title,
      description: item.description,
    }));
  }, [items]);

  return { items, summary, uploadedPhotos, max, add, remove, retry, move, update, clear };
};

export type PhotoUploadQueue = ReturnType<typeof usePhotoUploadQueue>;

export default usePhotoUploadQueue;
