(() => {
  const chapter = document.querySelector('[data-storybook-chapter="one"]');
  if (!chapter) return;

  const rope = chapter.querySelector('.journey-thread__rope');
  const lina = chapter.querySelector('.journey-thread__lina');
  const stops = Array.from(chapter.querySelectorAll('[data-stop-target]'));
  const stopPositions = ['2%', '17%', '32%', '47%', '62%', '77%', '91%'];
  let soundEnabled = localStorage.getItem('vaelinya-story-sounds') === 'on';
  let audioContext;

  function setStop(stopNumber) {
    const index = Math.max(1, Math.min(7, Number(stopNumber))) - 1;
    if (rope) rope.dataset.currentStop = String(index + 1);
    if (lina) {
      lina.style.setProperty('--lina-progress', stopPositions[index]);
      lina.animate(
        [
          { transform: 'translateY(0)' },
          { transform: 'translateY(-0.35rem)' },
          { transform: 'translateY(0)' },
        ],
        { duration: 420, easing: 'ease-out' }
      );
    }
    stops.forEach((button) => {
      button.classList.toggle('is-current', Number(button.dataset.stopTarget) === index + 1);
    });
    localStorage.setItem('vaelinya-storybook-chapter-one-stop', String(index + 1));
  }

  chapter.addEventListener('click', (event) => {
    const stopTrigger = event.target.closest('[data-storybook-stop]');
    if (stopTrigger) setStop(stopTrigger.dataset.storybookStop);

    const directStop = event.target.closest('[data-stop-target]');
    if (directStop) setStop(directStop.dataset.stopTarget);
  });

  const savedStop = localStorage.getItem('vaelinya-storybook-chapter-one-stop');
  if (savedStop) setStop(savedStop);

  const enableButton = chapter.querySelector('[data-enable-story-sounds]');
  if (enableButton) {
    enableButton.textContent = soundEnabled ? 'Story sounds enabled' : 'Enable story sounds';
    enableButton.addEventListener('click', () => {
      soundEnabled = true;
      localStorage.setItem('vaelinya-story-sounds', 'on');
      enableButton.textContent = 'Story sounds enabled';
      playTone();
    });
  }

  chapter.querySelectorAll('[data-play-story-sound]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!soundEnabled) {
        if (enableButton) enableButton.focus();
        return;
      }
      playTone();
    });
  });

  function playTone() {
    try {
      audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(392, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(523.25, audioContext.currentTime + 0.22);
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.45);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.48);
    } catch (error) {
      // Sound is optional. If the browser blocks Web Audio, the page still works.
    }
  }

  const imageChange = chapter.querySelector('[data-image-change]');
  const changeFeedback = chapter.querySelector('[data-change-feedback]');
  chapter.querySelectorAll('[data-change-answer]').forEach((button) => {
    button.addEventListener('click', () => {
      if (imageChange) imageChange.classList.add('is-changed');
      if (changeFeedback) changeFeedback.hidden = false;
      setStop(5);
    });
  });

  const markFeedback = chapter.querySelector('[data-mark-feedback]');
  chapter.querySelectorAll('[data-mark-choice]').forEach((button) => {
    button.addEventListener('click', () => {
      chapter.querySelectorAll('[data-mark-choice]').forEach((choice) => choice.removeAttribute('aria-pressed'));
      button.setAttribute('aria-pressed', 'true');
      if (markFeedback) markFeedback.hidden = false;
      setStop(6);
    });
  });
})();
