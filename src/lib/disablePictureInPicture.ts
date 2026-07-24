/** Block Picture-in-Picture for every <video> in SoundLab. */

function lockVideo(video: HTMLVideoElement) {
  try {
    video.disablePictureInPicture = true;
  } catch {
    /* ignore */
  }
  try {
    video.setAttribute('disablepictureinpicture', '');
  } catch {
    /* ignore */
  }
}

function lockAllVideos(root: ParentNode = document) {
  root.querySelectorAll('video').forEach((el) => lockVideo(el));
}

export function installDisablePictureInPicture() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Block the PiP API even if something calls it manually
  const proto = HTMLVideoElement.prototype as HTMLVideoElement & {
    requestPictureInPicture?: () => Promise<PictureInPictureWindow>;
  };
  if (typeof proto.requestPictureInPicture === 'function') {
    proto.requestPictureInPicture = function blockedPip() {
      return Promise.reject(new DOMException('Picture-in-Picture is disabled in SoundLab', 'NotAllowedError'));
    };
  }

  const doc = document as Document & {
    exitPictureInPicture?: () => Promise<void>;
  };
  if (document.pictureInPictureElement && typeof doc.exitPictureInPicture === 'function') {
    void doc.exitPictureInPicture().catch(() => undefined);
  }

  document.addEventListener(
    'enterpictureinpicture',
    (event) => {
      event.preventDefault();
      const docPip = document as Document & {
        exitPictureInPicture?: () => Promise<void>;
      };
      if (typeof docPip.exitPictureInPicture === 'function') {
        void docPip.exitPictureInPicture().catch(() => undefined);
      }
    },
    true,
  );

  lockAllVideos();

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node instanceof HTMLVideoElement) {
          lockVideo(node);
          return;
        }
        lockAllVideos(node);
      });
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
}
