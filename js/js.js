    const imageInput = document.getElementById('imageInput');
    const dropZone = document.getElementById('dropZone');
    const dropHint = document.getElementById('dropHint');
    const emptyState = document.getElementById('emptyState');
    const previewWrap = document.getElementById('previewWrap');
    const previewCanvas = document.getElementById('previewCanvas');
    const cropBox = document.getElementById('cropBox');
    const previewCtx = previewCanvas.getContext('2d', { alpha: false });
    const exportCanvas = document.getElementById('exportCanvas');
    const exportCtx = exportCanvas.getContext('2d', { alpha: false });
    const mode = document.getElementById('mode');
    const duration = document.getElementById('duration');
    const zoom = document.getElementById('zoom');
    const fps = document.getElementById('fps');
    const resolution = document.getElementById('resolution');
    const format = document.getElementById('format');
    const quality = document.getElementById('quality');
    const durationValue = document.getElementById('durationValue');
    const zoomValue = document.getElementById('zoomValue');
    const fpsValue = document.getElementById('fpsValue');
    const playBtn = document.getElementById('playBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    const timeLabel = document.getElementById('timeLabel');
    const exportBtn = document.getElementById('exportBtn');
    const statusText = document.getElementById('status');
    const progress = document.getElementById('progress');
    const result = document.getElementById('result');
    const resultVideo = document.getElementById('resultVideo');
    const resultGif = document.getElementById('resultGif');
    const downloadBtn = document.getElementById('downloadBtn');
    const resultInfo = document.getElementById('resultInfo');

    let img = null;
    let imageName = 'image-video';
    let animationId = null;
    let playing = false;
    let startTime = 0;
    let pausedAt = 0;
    let dragCrop = null;

    function setStatus(message, pct = null) {
      statusText.textContent = message;
      if (pct !== null) progress.style.width = Math.max(0, Math.min(100, pct)) + '%';
    }

    function updateLabels() {
      durationValue.textContent = `${duration.value}s`;
      zoomValue.textContent = `${zoom.value}%`;
      fpsValue.textContent = fps.value;
      renderPreview(pausedAt || 0);
    }

    function getOutputSize() {
      const value = resolution.value;
      if (value === 'source') {
        const maxSide = 1920;
        const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
        return {
          width: Math.round(img.naturalWidth * scale),
          height: Math.round(img.naturalHeight * scale)
        };
      }
      const [width, height] = value.split('x').map(Number);
      return { width, height };
    }

    function fitPreviewCanvas() {
      if (!img) return;
      const box = dropZone.getBoundingClientRect();
      const maxW = Math.max(320, box.width - 24);
      const maxH = Math.max(280, Math.min(window.innerHeight * 0.68, 720));
      const ratio = img.naturalWidth / img.naturalHeight;
      let w = maxW;
      let h = w / ratio;
      if (h > maxH) { h = maxH; w = h * ratio; }
      previewCanvas.width = Math.round(w);
      previewCanvas.height = Math.round(h);
    }

    function easeInOut(t) {
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    function getCropSourceRect() {
      if (!img || cropBox.classList.contains('hidden')) {
        return { sx: 0, sy: 0, sw: img.naturalWidth, sh: img.naturalHeight };
      }
      const canvasRect = previewCanvas.getBoundingClientRect();
      const cropRect = cropBox.getBoundingClientRect();
      const x = Math.max(0, cropRect.left - canvasRect.left);
      const y = Math.max(0, cropRect.top - canvasRect.top);
      const w = Math.min(cropRect.width, canvasRect.width - x);
      const h = Math.min(cropRect.height, canvasRect.height - y);
      return {
        sx: x * img.naturalWidth / canvasRect.width,
        sy: y * img.naturalHeight / canvasRect.height,
        sw: w * img.naturalWidth / canvasRect.width,
        sh: h * img.naturalHeight / canvasRect.height
      };
    }

    function drawFrame(ctx, canvas, t) {
      if (!img) return;
      const crop = getCropSourceRect();
      const d = Number(duration.value);
      const p = Math.max(0, Math.min(1, t / d));
      const eased = easeInOut(p);
      const z = Number(zoom.value) / 100;
      const scale = mode.value === 'in' ? 1 + eased * z : 1 + (1 - eased) * z;

      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const canvasRatio = canvas.width / canvas.height;
      const cropRatio = crop.sw / crop.sh;
      let baseW, baseH;

      if (cropRatio > canvasRatio) {
        baseH = canvas.height;
        baseW = baseH * cropRatio;
      } else {
        baseW = canvas.width;
        baseH = baseW / cropRatio;
      }

      const drawW = baseW * scale;
      const drawH = baseH * scale;
      const x = (canvas.width - drawW) / 2;
      const y = (canvas.height - drawH) / 2;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, x, y, drawW, drawH);
    }

    function renderPreview(t = 0) {
      if (!img) return;
      emptyState.classList.add('hidden');
      previewWrap.classList.remove('hidden');
      fitPreviewCanvas();
      drawFrame(previewCtx, previewCanvas, t);
      timeLabel.textContent = `${t.toFixed(1)}s`;
    }

    function loadImage(file) {
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        setStatus('Please choose or drop an image file.', 0);
        return;
      }
      imageName = file.name.replace(/\.[^/.]+$/, '') || 'image-video';
      const url = URL.createObjectURL(file);
      const nextImg = new Image();
      nextImg.onload = () => {
        URL.revokeObjectURL(url);
        img = nextImg;
        pausedAt = 0;
        renderPreview(0);
        setTimeout(() => setCropPreset('full'), 50);
        setStatus(`Loaded: ${file.name} (${img.naturalWidth}x${img.naturalHeight})`, 0);
      };
      nextImg.src = url;
    }

    imageInput.addEventListener('change', e => loadImage(e.target.files[0]));

    ['dragenter', 'dragover'].forEach(name => {
      dropZone.addEventListener(name, e => {
        e.preventDefault();
        dropZone.classList.add('border-purple-400');
        dropHint.classList.remove('opacity-0');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      dropZone.addEventListener(name, e => {
        e.preventDefault();
        dropZone.classList.remove('border-purple-400');
        dropHint.classList.add('opacity-0');
      });
    });

    dropZone.addEventListener('drop', e => loadImage(e.dataTransfer.files[0]));
    document.body.addEventListener('dragover', e => e.preventDefault());
    document.body.addEventListener('drop', e => e.preventDefault());

    [mode, duration, zoom, fps, resolution].forEach(el => el.addEventListener('input', updateLabels));
    window.addEventListener('resize', () => {
      renderPreview(pausedAt);
      setTimeout(() => clampCropBox(), 20);
    });

    function setCropPreset(type) {
      if (!img) return;
      const rect = previewCanvas.getBoundingClientRect();
      const wrapRect = previewWrap.getBoundingClientRect();
      cropBox.classList.remove('hidden');
      let w = rect.width, h = rect.height, l = rect.left - wrapRect.left, t = rect.top - wrapRect.top;
      if (type === 'free') {
        w = rect.width * 0.72;
        h = rect.height * 0.58;
        l = rect.left - wrapRect.left + (rect.width - w) / 2;
        t = rect.top - wrapRect.top + (rect.height - h) / 2;
      } else if (type === 'square') {
        w = h = Math.min(rect.width, rect.height) * 0.86;
        l = rect.left - wrapRect.left + (rect.width - w) / 2;
        t = rect.top - wrapRect.top + (rect.height - h) / 2;
      }
      cropBox.style.left = l + 'px';
      cropBox.style.top = t + 'px';
      cropBox.style.width = w + 'px';
      cropBox.style.height = h + 'px';
      clampCropBox();
      renderPreview(pausedAt || 0);
    }

    function clampCropBox() {
      const rect = previewCanvas.getBoundingClientRect();
      const wrapRect = previewWrap.getBoundingClientRect();
      const minSize = 18;
      let l = parseFloat(cropBox.style.left) || 0;
      let t = parseFloat(cropBox.style.top) || 0;
      let w = parseFloat(cropBox.style.width) || rect.width;
      let h = parseFloat(cropBox.style.height) || rect.height;
      const canvasLeft = rect.left - wrapRect.left;
      const canvasTop = rect.top - wrapRect.top;
      w = Math.max(minSize, Math.min(w, rect.width));
      h = Math.max(minSize, Math.min(h, rect.height));
      l = Math.max(canvasLeft, Math.min(l, canvasLeft + rect.width - w));
      t = Math.max(canvasTop, Math.min(t, canvasTop + rect.height - h));
      cropBox.style.left = l + 'px';
      cropBox.style.top = t + 'px';
      cropBox.style.width = w + 'px';
      cropBox.style.height = h + 'px';
    }

    cropBox.addEventListener('pointerdown', e => {
      e.preventDefault();
      cropBox.setPointerCapture(e.pointerId);
      dragCrop = {
        handle: e.target.dataset.handle || 'move',
        x: e.clientX,
        y: e.clientY,
        l: parseFloat(cropBox.style.left),
        t: parseFloat(cropBox.style.top),
        w: parseFloat(cropBox.style.width),
        h: parseFloat(cropBox.style.height)
      };
    });

    cropBox.addEventListener('pointermove', e => {
      if (!dragCrop) return;
      const dx = e.clientX - dragCrop.x;
      const dy = e.clientY - dragCrop.y;
      let { l, t, w, h } = dragCrop;
      if (dragCrop.handle === 'move') { l += dx; t += dy; }
      else {
        if (dragCrop.handle.includes('r')) w += dx;
        if (dragCrop.handle.includes('b')) h += dy;
        if (dragCrop.handle.includes('l')) { l += dx; w -= dx; }
        if (dragCrop.handle.includes('t')) { t += dy; h -= dy; }
      }
      cropBox.style.left = l + 'px';
      cropBox.style.top = t + 'px';
      cropBox.style.width = w + 'px';
      cropBox.style.height = h + 'px';
      clampCropBox();
      renderPreview(pausedAt || 0);
    });

    cropBox.addEventListener('pointerup', () => { dragCrop = null; });
    document.getElementById('fullCropBtn').addEventListener('click', () => setCropPreset('full'));
    document.getElementById('freeCropBtn').addEventListener('click', () => setCropPreset('free'));
    document.getElementById('squareCropBtn').addEventListener('click', () => setCropPreset('square'));

    function playPreview() {
      if (!img) return setStatus('Choose an image first.', 0);
      cancelAnimationFrame(animationId);
      playing = true;
      startTime = performance.now() - pausedAt * 1000;

      function tick(now) {
        if (!playing) return;
        const t = (now - startTime) / 1000;
        const d = Number(duration.value);
        pausedAt = Math.min(t, d);
        renderPreview(pausedAt);
        if (t >= d) {
          playing = false;
          pausedAt = 0;
          return;
        }
        animationId = requestAnimationFrame(tick);
      }
      animationId = requestAnimationFrame(tick);
    }

    playBtn.addEventListener('click', playPreview);
    pauseBtn.addEventListener('click', () => { playing = false; cancelAnimationFrame(animationId); });
    resetBtn.addEventListener('click', () => { playing = false; pausedAt = 0; cancelAnimationFrame(animationId); renderPreview(0); });

    function pickVideoMime() {
      const types = [
        'video/mp4;codecs=avc1',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm'
      ];
      return types.find(type => MediaRecorder.isTypeSupported(type)) || '';
    }

    async function exportVideo() {
      const size = getOutputSize();
      exportCanvas.width = Math.max(2, Math.round(size.width / 2) * 2);
      exportCanvas.height = Math.max(2, Math.round(size.height / 2) * 2);
      const selectedFps = Number(fps.value);
      const totalFrames = Math.ceil(Number(duration.value) * selectedFps);
      const stream = exportCanvas.captureStream(selectedFps);
      const mimeType = pickVideoMime();
      const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: Number(quality.value)
      });
      const chunks = [];

      recorder.ondataavailable = e => e.data.size && chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
        const url = URL.createObjectURL(blob);
        resultVideo.src = url;
        resultVideo.classList.remove('hidden');
        resultGif.classList.add('hidden');
        downloadBtn.href = url;
        downloadBtn.download = `${imageName}-zoom.${extension}`;
        downloadBtn.textContent = `Download ${extension.toUpperCase()}`;
        resultInfo.textContent = `${exportCanvas.width}x${exportCanvas.height} • ${(blob.size / 1024 / 1024).toFixed(2)} MB`;
        result.classList.remove('hidden');
        setStatus('Video export complete.', 100);
        exportBtn.disabled = false;
      };

      recorder.start(1000);
      setStatus('Exporting video...', 0);
      exportBtn.disabled = true;

      let frame = 0;
      const frameDelay = 1000 / selectedFps;

      function renderNextFrame() {
        const t = frame / selectedFps;
        drawFrame(exportCtx, exportCanvas, t);
        setStatus(`Exporting video frame ${frame + 1}/${totalFrames}`, (frame / totalFrames) * 100);
        frame++;
        if (frame <= totalFrames) setTimeout(renderNextFrame, frameDelay);
        else recorder.stop();
      }
      renderNextFrame();
    }

    async function exportGif() {
      const size = getOutputSize();
      exportCanvas.width = Math.max(2, Math.round(size.width / 2) * 2);
      exportCanvas.height = Math.max(2, Math.round(size.height / 2) * 2);
      const selectedFps = Math.min(30, Number(fps.value));
      const totalFrames = Math.ceil(Number(duration.value) * selectedFps);

      if (exportCanvas.width > 1920 || exportCanvas.height > 1920) {
        const ok = confirm('High-resolution GIFs can become huge and slow. Continue anyway?');
        if (!ok) return;
      }

      const gif = new GIF({
        workers: 2,
        quality: 5,
        width: exportCanvas.width,
        height: exportCanvas.height,
        workerScript: GIF_WORKER_URL
      });

      exportBtn.disabled = true;
      setStatus('Capturing GIF frames...', 0);

      for (let frame = 0; frame <= totalFrames; frame++) {
        const t = frame / selectedFps;
        drawFrame(exportCtx, exportCanvas, t);
        gif.addFrame(exportCtx, { copy: true, delay: 1000 / selectedFps });
        setStatus(`Capturing GIF frame ${frame + 1}/${totalFrames + 1}`, (frame / totalFrames) * 70);
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      gif.on('progress', value => setStatus(`Encoding GIF ${Math.round(value * 100)}%`, 70 + value * 30));
      gif.on('finished', blob => {
        const url = URL.createObjectURL(blob);
        resultGif.src = url;
        resultGif.classList.remove('hidden');
        resultVideo.classList.add('hidden');
        downloadBtn.href = url;
        downloadBtn.download = `${imageName}-zoom.gif`;
        downloadBtn.textContent = 'Download GIF';
        resultInfo.textContent = `${exportCanvas.width}x${exportCanvas.height} • ${(blob.size / 1024 / 1024).toFixed(2)} MB`;
        result.classList.remove('hidden');
        setStatus('GIF export complete.', 100);
        exportBtn.disabled = false;
      });

      gif.render();
    }

    exportBtn.addEventListener('click', async () => {
      if (!img) return setStatus('Choose an image first.', 0);
      try {
        if (format.value === 'gif') await exportGif();
        else await exportVideo();
      } catch (error) {
        console.error(error);
        setStatus(`Export failed: ${error.message || error}`, 0);
        exportBtn.disabled = false;
      }
    });

    updateLabels();
