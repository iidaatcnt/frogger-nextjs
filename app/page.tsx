'use client';

import { useEffect, useRef, useState } from 'react';

export default function FroggerGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState({
    score: 0,
    lives: 3,
    gameOver: false,
    level: 1
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 効果音システム
    let audioContext: AudioContext | null = null;

    function initAudio() {
      if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
    }

    function playJumpSound() {
      if (!audioContext) return;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    }

    function playScoreSound() {
      if (!audioContext) return;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(500, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.2);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.3);

      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime + 0.3);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    }

    function playDeathSound() {
      if (!audioContext) return;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.5);

      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    }

    function playGameOverSound() {
      if (!audioContext) return;
      const oscillator1 = audioContext.createOscillator();
      const oscillator2 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator1.frequency.setValueAtTime(300, audioContext.currentTime);
      oscillator1.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 1);

      oscillator2.frequency.setValueAtTime(200, audioContext.currentTime);
      oscillator2.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 1);

      gainNode.gain.setValueAtTime(0.6, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);

      oscillator1.start(audioContext.currentTime);
      oscillator2.start(audioContext.currentTime);
      oscillator1.stop(audioContext.currentTime + 1);
      oscillator2.stop(audioContext.currentTime + 1);
    }

    // カエルオブジェクト
    const frog = {
      x: 380,
      y: 550,
      width: 40,
      height: 40,
      startX: 380,
      startY: 550,
      isJumping: false,
      jumpProgress: 0,
      jumpStartX: 0,
      jumpStartY: 0,
      jumpEndX: 0,
      jumpEndY: 0,
      jumpDuration: 200
    };

    // 車と丸太の配列
    let cars: any[] = [];
    let logs: any[] = [];

    // ゲームエリアの設定
    const ROAD_START = 300;
    const ROAD_END = 500;
    const WATER_START = 100;
    const WATER_END = 250;
    const GOAL_Y = 50;

    // キャンバスサイズを調整
    function resizeCanvas() {
      if (!canvas) return;
      const container = canvas.parentElement;
      if (!container) return;
      const containerWidth = container.clientWidth;
      const maxWidth = 800;
      const scale = Math.min(1, containerWidth / maxWidth);

      canvas.style.width = (maxWidth * scale) + 'px';
      canvas.style.height = (600 * scale) + 'px';
    }

    // 障害物を作成
    function createObstacles() {
      if (!canvas) return;
      cars = [];
      logs = [];

      // 車を作成（道路エリア）
      for (let lane = 0; lane < 4; lane++) {
        const y = ROAD_START + lane * 50;
        const direction = lane % 2 === 0 ? 1 : -1;
        const speed = 2 + Math.random() * 2;

        for (let i = 0; i < 3; i++) {
          cars.push({
            x: direction > 0 ? -100 - i * 200 : canvas.width + i * 200,
            y: y,
            width: 60,
            height: 30,
            speed: speed * direction,
            color: ['#f00', '#00f', '#ff0', '#f0f'][lane]
          });
        }
      }

      // 丸太を作成（川エリア）
      for (let lane = 0; lane < 3; lane++) {
        const y = WATER_START + lane * 50;
        const direction = lane % 2 === 0 ? 1 : -1;
        const speed = 1 + Math.random() * 1.5;

        for (let i = 0; i < 2; i++) {
          logs.push({
            x: direction > 0 ? -150 - i * 300 : canvas.width + i * 300,
            y: y,
            width: 120,
            height: 30,
            speed: speed * direction
          });
        }
      }
    }

    // 移動処理
    function handleMove(direction: string) {
      if (!canvas || gameState.gameOver || frog.isJumping) return;

      const moveDistance = 50;
      let newX = frog.x;
      let newY = frog.y;

      switch(direction) {
        case 'up':
          if (frog.y > 0) newY = frog.y - moveDistance;
          break;
        case 'down':
          if (frog.y < canvas.height - frog.height) newY = frog.y + moveDistance;
          break;
        case 'left':
          if (frog.x > 0) newX = frog.x - moveDistance;
          break;
        case 'right':
          if (frog.x < canvas.width - frog.width) newX = frog.x + moveDistance;
          break;
      }

      // ジャンプアニメーションを開始
      if (newX !== frog.x || newY !== frog.y) {
        playJumpSound();
        frog.jumpStartX = frog.x;
        frog.jumpStartY = frog.y;
        frog.jumpEndX = newX;
        frog.jumpEndY = newY;
        frog.isJumping = true;
        frog.jumpProgress = 0;
      }
    }

    // 描画関数たち
    function drawStars() {
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      const starPositions = [
        {x: 100, y: 20}, {x: 200, y: 35}, {x: 350, y: 15}, {x: 450, y: 40},
        {x: 600, y: 25}, {x: 700, y: 30}, {x: 50, y: 45}, {x: 750, y: 10}
      ];

      starPositions.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, 1, 0, 2 * Math.PI);
        ctx.fill();
      });
    }

    function drawFlowers() {
      if (!ctx) return;
      const flowerPositions = [
        {x: 80, y: 25, color: '#FF69B4'}, {x: 180, y: 30, color: '#FFB6C1'},
        {x: 280, y: 20, color: '#FFA07A'}, {x: 380, y: 35, color: '#FF69B4'},
        {x: 480, y: 25, color: '#FFB6C1'}, {x: 580, y: 30, color: '#FFA07A'},
        {x: 680, y: 20, color: '#FF69B4'}
      ];

      flowerPositions.forEach(flower => {
        // 花びら
        ctx.fillStyle = flower.color;
        for (let i = 0; i < 5; i++) {
          const angle = (i * 2 * Math.PI) / 5;
          const petalX = flower.x + Math.cos(angle) * 4;
          const petalY = flower.y + Math.sin(angle) * 4;
          ctx.beginPath();
          ctx.arc(petalX, petalY, 3, 0, 2 * Math.PI);
          ctx.fill();
        }
        // 花の中心
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(flower.x, flower.y, 2, 0, 2 * Math.PI);
        ctx.fill();
      });
    }

    function drawGrass(startY: number, height: number) {
      if (!ctx || !canvas) return;
      ctx.strokeStyle = '#4CAF50';
      ctx.lineWidth = 2;
      for (let x = 0; x < canvas.width; x += 10) {
        ctx.beginPath();
        ctx.moveTo(x, startY + height);
        ctx.lineTo(x + Math.random() * 4 - 2, startY + height - 8);
        ctx.stroke();
      }
    }

    function drawCar(car: any) {
      if (!ctx) return;
      // 車体
      ctx.fillStyle = car.color;
      ctx.fillRect(car.x, car.y, car.width, car.height);

      // 車の窓
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(car.x + 5, car.y + 5, car.width - 10, car.height - 15);

      // 車のタイヤ
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(car.x + 10, car.y + car.height, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(car.x + car.width - 10, car.y + car.height, 6, 0, 2 * Math.PI);
      ctx.fill();

      // 車のライト
      ctx.fillStyle = '#FFFF99';
      if (car.speed > 0) {
        ctx.fillRect(car.x + car.width - 5, car.y + 5, 3, 8);
        ctx.fillRect(car.x + car.width - 5, car.y + car.height - 13, 3, 8);
      } else {
        ctx.fillRect(car.x + 2, car.y + 5, 3, 8);
        ctx.fillRect(car.x + 2, car.y + car.height - 13, 3, 8);
      }
    }

    function drawLog(log: any) {
      if (!ctx) return;
      // 丸太の影
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(log.x + 2, log.y + 2, log.width, log.height);

      // 丸太本体
      ctx.fillStyle = '#D2691E';
      ctx.fillRect(log.x, log.y, log.width, log.height);

      // 丸太の年輪
      ctx.strokeStyle = '#8B4513';
      ctx.lineWidth = 2;
      for (let i = 0; i < log.width; i += 25) {
        ctx.beginPath();
        ctx.moveTo(log.x + i, log.y);
        ctx.lineTo(log.x + i, log.y + log.height);
        ctx.stroke();
      }

      // 丸太の端の円
      ctx.fillStyle = '#CD853F';
      ctx.beginPath();
      ctx.arc(log.x, log.y + log.height/2, log.height/2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(log.x + log.width, log.y + log.height/2, log.height/2, 0, 2 * Math.PI);
      ctx.fill();

      // 年輪の詳細
      ctx.strokeStyle = '#8B4513';
      ctx.lineWidth = 1;
      for (let r = 5; r < log.height/2; r += 5) {
        ctx.beginPath();
        ctx.arc(log.x, log.y + log.height/2, r, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(log.x + log.width, log.y + log.height/2, r, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }

    function drawFrog() {
      if (!ctx) return;
      let drawX = frog.x;
      let drawY = frog.y;
      let scale = 1;

      // ジャンプアニメーション
      if (frog.isJumping) {
        const progress = frog.jumpProgress;
        const jumpHeight = Math.sin(progress * Math.PI) * 20;
        drawY -= jumpHeight;
        scale = 1 + Math.sin(progress * Math.PI) * 0.2;
      }

      const scaledWidth = frog.width * scale;
      const scaledHeight = frog.height * scale;
      const offsetX = (scaledWidth - frog.width) / 2;
      const offsetY = (scaledHeight - frog.height) / 2;

      // カエルの影（ジャンプ中のみ）
      if (frog.isJumping) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(frog.jumpEndX + frog.width/2, frog.jumpEndY + frog.height/2, 
                   frog.width/3, frog.height/4, 0, 0, 2 * Math.PI);
        ctx.fill();
      }

      // 後ろ足（大きく広がった状態）
      ctx.fillStyle = '#4CAF50';
      
      // 左後ろ足
      ctx.beginPath();
      ctx.ellipse(drawX - offsetX - 5, drawY - offsetY + scaledHeight - 10, 
                 12 * scale, 18 * scale, 0, 0, 2 * Math.PI);
      ctx.fill();
      
      // 右後ろ足
      ctx.beginPath();
      ctx.ellipse(drawX - offsetX + scaledWidth + 5, drawY - offsetY + scaledHeight - 10, 
                 12 * scale, 18 * scale, 0, 0, 2 * Math.PI);
      ctx.fill();

      // カエルの胴体（上から見た楕円形）
      ctx.fillStyle = '#66BB6A';
      ctx.beginPath();
      ctx.ellipse(drawX - offsetX + scaledWidth/2, drawY - offsetY + scaledHeight/2, 
                 scaledWidth/2.2, scaledHeight/2.2, 0, 0, 2 * Math.PI);
      ctx.fill();

      // 背中の模様（ストライプ）
      ctx.fillStyle = '#4CAF50';
      ctx.beginPath();
      ctx.ellipse(drawX - offsetX + scaledWidth/2, drawY - offsetY + scaledHeight/3, 
                 scaledWidth/6, scaledHeight/4, 0, 0, 2 * Math.PI);
      ctx.fill();

      // 前足
      ctx.fillStyle = '#4CAF50';
      // 左前足
      ctx.beginPath();
      ctx.ellipse(drawX - offsetX + 5 * scale, drawY - offsetY + 8 * scale, 
                 8 * scale, 12 * scale, 0, 0, 2 * Math.PI);
      ctx.fill();
      // 右前足
      ctx.beginPath();
      ctx.ellipse(drawX - offsetX + scaledWidth - 5 * scale, drawY - offsetY + 8 * scale, 
                 8 * scale, 12 * scale, 0, 0, 2 * Math.PI);
      ctx.fill();

      // 頭部
      ctx.fillStyle = '#66BB6A';
      ctx.beginPath();
      ctx.ellipse(drawX - offsetX + scaledWidth/2, drawY - offsetY + 8 * scale, 
                 scaledWidth/3, scaledHeight/3, 0, 0, 2 * Math.PI);
      ctx.fill();

      // 目（上から見えるのは目の上部）
      ctx.fillStyle = '#2E7D32';
      // 左目の上部
      ctx.beginPath();
      ctx.ellipse(drawX - offsetX + 12 * scale, drawY - offsetY + 6 * scale, 
                 4 * scale, 6 * scale, 0, 0, 2 * Math.PI);
      ctx.fill();
      // 右目の上部
      ctx.beginPath();
      ctx.ellipse(drawX - offsetX + 28 * scale, drawY - offsetY + 6 * scale, 
                 4 * scale, 6 * scale, 0, 0, 2 * Math.PI);
      ctx.fill();

      // 目のハイライト
      ctx.fillStyle = '#81C784';
      ctx.beginPath();
      ctx.ellipse(drawX - offsetX + 12 * scale, drawY - offsetY + 4 * scale, 
                 2 * scale, 3 * scale, 0, 0, 2 * Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(drawX - offsetX + 28 * scale, drawY - offsetY + 4 * scale, 
                 2 * scale, 3 * scale, 0, 0, 2 * Math.PI);
      ctx.fill();
    }

    // 描画関数
    function draw() {
      if (!ctx || !canvas) return;
      // 背景をクリア
      ctx.fillStyle = '#001122';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 空に星を描画
      drawStars();

      // 道路を描画
      ctx.fillStyle = '#444';
      ctx.fillRect(0, ROAD_START, canvas.width, ROAD_END - ROAD_START);

      // 道路の車線を描画
      ctx.strokeStyle = '#ff0';
      ctx.lineWidth = 2;
      ctx.setLineDash([15, 10]);
      for (let i = 1; i < 4; i++) {
        const y = ROAD_START + i * 50;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // 川を描画（波模様付き）
      ctx.fillStyle = '#2196F3';
      ctx.fillRect(0, WATER_START, canvas.width, WATER_END - WATER_START);

      // 波の模様
      ctx.strokeStyle = '#64B5F6';
      ctx.lineWidth = 2;
      for (let y = WATER_START + 10; y < WATER_END; y += 15) {
        ctx.beginPath();
        for (let x = 0; x < canvas.width; x += 20) {
          const waveY = y + Math.sin((x + Date.now() * 0.001) * 0.1) * 3;
          if (x === 0) {
            ctx.moveTo(x, waveY);
          } else {
            ctx.lineTo(x, waveY);
          }
        }
        ctx.stroke();
      }

      // ゴールエリアを描画（お花畑風）
      const gradient = ctx.createLinearGradient(0, 0, 0, GOAL_Y);
      gradient.addColorStop(0, '#8BC34A');
      gradient.addColorStop(1, '#4CAF50');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, GOAL_Y);

      // お花を描画
      drawFlowers();

      // 安全地帯を描画（草地風）
      ctx.fillStyle = '#689F38';
      ctx.fillRect(0, GOAL_Y, canvas.width, 50);
      ctx.fillRect(0, 250, canvas.width, 50);
      ctx.fillRect(0, 500, canvas.width, 50);

      // 草の模様
      drawGrass(GOAL_Y, 50);
      drawGrass(250, 50);
      drawGrass(500, 50);

      // 車を描画
      cars.forEach(car => {
        drawCar(car);
      });

      // 丸太を描画
      logs.forEach(log => {
        drawLog(log);
      });

      // カエルを描画
      drawFrog();
    }

    // 更新関数
    function update() {
      if (!canvas || gameState.gameOver) return;

      // カエルのジャンプアニメーション更新
      if (frog.isJumping) {
        frog.jumpProgress += 1/12;

        if (frog.jumpProgress >= 1) {
          frog.jumpProgress = 0;
          frog.isJumping = false;
          frog.x = frog.jumpEndX;
          frog.y = frog.jumpEndY;
        } else {
          const easeProgress = frog.jumpProgress;
          frog.x = frog.jumpStartX + (frog.jumpEndX - frog.jumpStartX) * easeProgress;
          frog.y = frog.jumpStartY + (frog.jumpEndY - frog.jumpStartY) * easeProgress;
        }
      }

      // 車を更新
      cars.forEach(car => {
        car.x += car.speed;

        if (car.speed > 0 && car.x > canvas.width + 100) {
          car.x = -car.width - 100;
        } else if (car.speed < 0 && car.x < -car.width - 100) {
          car.x = canvas.width + 100;
        }
      });

      // 丸太を更新
      logs.forEach(log => {
        log.x += log.speed;

        if (log.speed > 0 && log.x > canvas.width + 150) {
          log.x = -log.width - 150;
        } else if (log.speed < 0 && log.x < -log.width - 150) {
          log.x = canvas.width + 150;
        }
      });

      // 衝突判定
      checkCollisions();

      // ゴール判定
      if (frog.y <= GOAL_Y) {
        setGameState(prev => ({ ...prev, score: prev.score + 100 }));
        playScoreSound();
        resetFrog();
      }
    }

    function checkCollisions() {
      if (!canvas) return;
      // 車との衝突
      if (frog.y >= ROAD_START && frog.y <= ROAD_END - frog.height) {
        cars.forEach(car => {
          if (frog.x < car.x + car.width &&
              frog.x + frog.width > car.x &&
              frog.y < car.y + car.height &&
              frog.y + frog.height > car.y) {
            loseLife();
          }
        });
      }

      // 水エリアでの丸太判定
      if (frog.y >= WATER_START && frog.y <= WATER_END - frog.height) {
        let onLog = false;
        logs.forEach(log => {
          if (frog.x < log.x + log.width &&
              frog.x + frog.width > log.x &&
              frog.y < log.y + log.height &&
              frog.y + frog.height > log.y) {
            onLog = true;
            frog.x += log.speed;
          }
        });

        if (!onLog) {
          loseLife();
        }
      }

      // 画面外チェック
      if (frog.x < 0 || frog.x > canvas.width - frog.width) {
        loseLife();
      }
    }

    function loseLife() {
      playDeathSound();
      setGameState(prev => {
        const newLives = prev.lives - 1;
        if (newLives <= 0) {
          setTimeout(() => {
            playGameOverSound();
          }, 100);
          return { ...prev, lives: 0, gameOver: true };
        } else {
          resetFrog();
          return { ...prev, lives: newLives };
        }
      });
    }

    function resetFrog() {
      frog.x = frog.startX;
      frog.y = frog.startY;
      frog.isJumping = false;
      frog.jumpProgress = 0;
    }

    // キーボード入力
    const handleKeyDown = (e: KeyboardEvent) => {
      initAudio();

      if (gameState.gameOver && e.key.toLowerCase() === 'r') {
        restart();
        return;
      }

      if (gameState.gameOver || frog.isJumping) return;

      let direction = null;
      switch(e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          direction = 'up';
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          direction = 'down';
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          direction = 'left';
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          direction = 'right';
          break;
      }

      if (direction) {
        handleMove(direction);
      }
    };

    // モバイルコントロールの設定
    function setupMobileControls() {
      const buttons = document.querySelectorAll('.control-btn');
      buttons.forEach(button => {
        const handleTouch = (e: Event) => {
          e.preventDefault();
          initAudio();
          const direction = (button as HTMLElement).dataset.direction;
          if (direction) {
            handleMove(direction);
          }
        };

        button.addEventListener('touchstart', handleTouch);
        button.addEventListener('click', handleTouch);
      });
    }

    function restart() {
      setGameState({
        score: 0,
        lives: 3,
        gameOver: false,
        level: 1
      });
      resetFrog();
      createObstacles();
    }

    // ゲームループ
    function gameLoop() {
      update();
      draw();
      requestAnimationFrame(gameLoop);
    }

    // 初期化
    resizeCanvas();
    createObstacles();
    setupMobileControls();
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', resizeCanvas);
    gameLoop();

    // クリーンアップ
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [gameState.gameOver]);

  const handleRestart = () => {
    setGameState({
      score: 0,
      lives: 3,
      gameOver: false,
      level: 1
    });
  };

  return (
    <>
      <div className="game-container">
        <h1>🐸 FROGGER 🐸</h1>
        <div className="info">
          <span>スコア: <span>{gameState.score}</span></span>
          <span>ライフ: <span>{gameState.lives}</span></span>
        </div>
        <canvas 
          ref={canvasRef}
          id="gameCanvas" 
          width="800" 
          height="600"
        />
        
        <div className="mobile-controls">
          <button className="control-btn up-btn" data-direction="up">↑</button>
          <button className="control-btn left-btn" data-direction="left">←</button>
          <button className="control-btn right-btn" data-direction="right">→</button>
          <button className="control-btn down-btn" data-direction="down">↓</button>
        </div>
        
        <div className="controls">
          矢印キー・WASD・タッチボタンでカエルを操作
        </div>
        <div className="sound-note">
          🔊 効果音あり（音声が有効になっている必要があります）
        </div>
        {gameState.gameOver && (
          <div className="game-over">
            GAME OVER
            <br />
            <button className="restart-btn" onClick={handleRestart}>リスタート</button>
          </div>
        )}
      </div>

      <style jsx>{`
        .game-container {
          text-align: center;
          width: 100%;
          max-width: 800px;
        }
        
        canvas {
          border: 2px solid #0f0;
          background: #111;
          image-rendering: pixelated;
          width: 100%;
          max-width: 800px;
          height: auto;
        }
        
        .info {
          margin: 10px 0;
          font-size: 16px;
          display: flex;
          justify-content: space-around;
          width: 100%;
        }
        
        .controls {
          margin: 15px 0;
          font-size: 12px;
          color: #ff0;
        }
        
        .mobile-controls {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          grid-template-rows: 1fr 1fr 1fr;
          gap: 10px;
          max-width: 200px;
          margin: 15px auto;
        }
        
        .control-btn {
          background: #333;
          border: 2px solid #0f0;
          color: #0f0;
          font-size: 24px;
          padding: 15px;
          border-radius: 8px;
          touch-action: manipulation;
          user-select: none;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 50px;
          cursor: pointer;
        }
        
        .control-btn:active {
          background: #0f0;
          color: #000;
          transform: scale(0.95);
        }
        
        .control-btn:disabled {
          opacity: 0.5;
          background: #222;
          border-color: #555;
          color: #555;
        }
        
        .up-btn { grid-column: 2; grid-row: 1; }
        .left-btn { grid-column: 1; grid-row: 2; }
        .right-btn { grid-column: 3; grid-row: 2; }
        .down-btn { grid-column: 2; grid-row: 3; }
        
        .sound-note {
          margin-top: 5px;
          font-size: 10px;
          color: #aaa;
        }
        
        .game-over {
          color: #f00;
          font-size: 20px;
          font-weight: bold;
          margin: 10px 0;
        }
        
        .restart-btn {
          background: #f00;
          border: 2px solid #f00;
          color: #fff;
          font-size: 16px;
          padding: 10px 20px;
          border-radius: 5px;
          margin: 10px;
          cursor: pointer;
        }
        
        .restart-btn:active {
          background: #a00;
          transform: scale(0.95);
        }
        
        @media (max-width: 600px) {
          .info { font-size: 14px; }
          .controls { font-size: 10px; }
          .mobile-controls { max-width: 180px; }
          .control-btn { 
            font-size: 20px; 
            padding: 12px;
            min-height: 45px;
          }
        }
      `}</style>
    </>
  );
}