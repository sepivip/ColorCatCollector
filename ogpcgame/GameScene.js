const NUM_CATS = 5;
const NUM_LIVES = 3;
const PREVIEW_DURATION = 5000;
const GAME_DURATION = 7000; // Duration of the preview phase in milliseconds
// const CAT_SIZE = 0.45; // Cat size multiplier
const { catSize: CAT_SIZE, fontSize: FONT_SIZE } = getResponsiveSettings();

function getResponsiveSettings() {
  const isSmallScreen = window.innerWidth < 768;

  const catSize = isSmallScreen ? 0.38 : 0.45;
  const fontSize = isSmallScreen ? "15px" : "24px";

  return { catSize, fontSize };
}

class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem("highScore") || "0", 10);
    this.lives = NUM_LIVES;
    this.catOrder = [];
    this.selectedCats = [];
    this.previewActive = false;
    this.countdownText = null;
    this.playingPhaseTimer = null;
    this.countdownTimer = null;
    this.gameOverActive = false;
  }

  preload() {
    this.load.svg("cat", "assets/cat.svg");
  }

  create() {
    const textStyle = {
      fontFamily: '"Press Start 2P"',
      fontSize: FONT_SIZE,
      fill: "#FFF",
    };

    this.highScoreText = this.add.text(16, 16, "High Score: 0", textStyle);
    this.scoreText = this.add.text(16, 50, "Score: 0", textStyle);
    this.livesText = this.add
      .text(this.scale.width - 16, 16, `Lives: ${NUM_LIVES}`, textStyle)
      .setOrigin(1, 0);

    // Load the high score from local storage
    this.highScore = parseInt(localStorage.getItem("highScore") || "0", 10);
    this.highScoreText.setText(`High Score: ${this.highScore}`);

    this.input.on("gameobjectdown", this.onCatClicked, this);
    // this.resetGame();

    this.createStartButton();
  }

  createStartButton() {
    const startButtonFontSize = Math.min(this.scale.width * 0.05, 24);
    this.startButton = this.add
      .text(this.scale.width / 2, this.scale.height / 2, "START GAME", {
        fontFamily: '"Press Start 2P"',
        fontSize: `${startButtonFontSize}px`,
        fill: "#FFF",
      })
      .setOrigin(0.5);
    this.startButton.setInteractive({ useHandCursor: true });
    this.startButton.setShadow(2, 2, "rgba(0,0,0,0.5)", 2);
    this.startButton.on("pointerdown", () => {
      this.startButton.destroy();
      this.resetGame();
    });

    // Add mouse over effects for startButton
    this.startButton.on("pointerover", () => {
      this.startButton.setTint(0x00ff00);
    });
    this.startButton.on("pointerout", () => {
      this.startButton.clearTint();
    });
  }
  showCountdown(duration, callback) {
    if (this.countdownText) {
      this.countdownText.destroy();
    }

    const textStyle = {
      fontFamily: '"Press Start 2P"',
      fontSize: FONT_SIZE,
      fill: "#FFF",
    };

    this.countdownText = this.add
      .text(this.scale.width / 2, this.scale.height - 50, "", textStyle)
      .setOrigin(0.5);
    let timeLeft = duration / 1000;

    this.countdownText.setText(`Time Left: ${timeLeft}`);
    const countdownTimer = this.time.addEvent({
      delay: 1000,
      callback: () => {
        timeLeft -= 1;
        this.countdownText.setText(`Time Left: ${timeLeft}`);
        if (timeLeft === 0) {
          countdownTimer.remove();
          this.countdownText.destroy();
          if (callback) {
            callback.call(this);
          }
        }
      },
      callbackScope: this,
      loop: true,
    });
    return countdownTimer;
  }

  update() {
    // Your game update logic here
  }

  generateCatOrder() {
    this.catOrder = [];
    for (let i = 0; i < NUM_CATS; i++) {
      this.catOrder.push(Phaser.Math.Between(0, 0xffffff));
    }
  }

  createCats(centered) {
    this.cats = this.add.group();
    const spacingPercent = 0.18; // Adjust this value to control the percentage of spacing between cats
    const minSpacing = 50; // Minimum spacing in pixels
    const maxSpacing = 120; // Maximum spacing in pixels
    const totalSpacing = (NUM_CATS - 1) * spacingPercent;

    for (let i = 0; i < NUM_CATS; i++) {
      const spacing = Math.min(
        Math.max(this.scale.width * spacingPercent, minSpacing),
        maxSpacing
      );
      const x = centered
        ? this.scale.width / 2 - ((NUM_CATS - 1) * spacing) / 2 + i * spacing
        : this.scale.width * (0.5 * (1 - totalSpacing) + i * spacingPercent);
      const y = this.scale.height / 2;
      const cat = this.add
        .sprite(x, y, "cat")
        .setInteractive()
        .setScale(CAT_SIZE);
      cat.setTint(this.catOrder[i]);
      cat.setData("order", i);
      this.cats.add(cat);
    }
  }

  shuffleCats() {
    this.cats.children.each((cat) => {
      let x, y;
      let hasOverlap;

      do {
        x = Phaser.Math.Between(this.scale.width * 0.1, this.scale.width * 0.9);
        y = Phaser.Math.Between(
          this.scale.height * 0.2,
          this.scale.height * 0.8
        );
        hasOverlap = false;

        this.cats.children.each((otherCat) => {
          if (cat === otherCat) {
            return;
          }
          const distance = Phaser.Math.Distance.Between(
            x,
            y,
            otherCat.x,
            otherCat.y
          );
          if (distance < cat.displayWidth * CAT_SIZE * 3) {
            hasOverlap = true;
          }
        });
      } while (hasOverlap);

      cat.setPosition(x, y);
    });
  }

  onCatClicked(pointer, gameObject) {
    if (this.previewActive || this.gameOverActive) return;

    const catOrder = gameObject.getData("order");
    if (catOrder === this.selectedCats.length) {
      this.selectedCats.push(catOrder);
      gameObject.destroy();

      if (this.selectedCats.length === this.catOrder.length) {
        this.playingPhaseTimer.remove(); // Add this line
        this.score += NUM_CATS;
        this.scoreText.setText(`Score: ${this.score}`);
        this.resetGame();
      }
    } else {
      if (this.playingPhaseTimer) {
        this.playingPhaseTimer.remove();
      }
      this.lives -= 1;
      this.livesText.setText(`Lives: ${this.lives}`);
      if (this.lives <= 0) {
        this.gameOver();
      } else {
        this.resetGame();
      }
    }
  }

  resetGame() {
    this.generateCatOrder();
    if (this.cats) {
      this.cats.clear(true, true);
    }
    this.selectedCats = [];

    // Update the high score if the current score is greater
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.highScoreText.setText(`High Score: ${this.highScore}`);
    }

    this.showPreview();
  }

  showPreview() {
    this.previewActive = true;
    this.createCats(true);
    this.showCountdown(PREVIEW_DURATION, () => {
      this.startPlayingPhase();
    });
  }

  startPlayingPhase() {
    this.previewActive = false;
    this.shuffleCats();
    this.startPlayingPhaseCountdown();
  }

  startPlayingPhaseCountdown() {
    const playingPhaseDuration = GAME_DURATION; // 5 seconds
    this.playingPhaseTimer = this.showCountdown(playingPhaseDuration, () => {
      this.lives -= 1;
      this.livesText.setText(`Lives: ${this.lives}`);
      if (this.lives <= 0) {
        this.gameOver();
      } else {
        this.resetGame();
      }
    });
  }

  gameOver() {
    // Save high score if necessary
    this.gameOverActive = true;
    const savedHighScore = parseInt(
      localStorage.getItem("highScore") || "0",
      10
    );
    if (this.score > savedHighScore) {
      localStorage.setItem("highScore", this.score);
      this.highScoreText.setText(`High Score: ${this.score}`);
    }
  
    // Calculate font sizes based on screen width
    const gameOverFontSize = Math.min(this.scale.width * 0.1, 48);
    const buttonFontSize = Math.min(this.scale.width * 0.05, 24);
  
    // Show game over message
    const gameOverText = this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 50, "Game Over", {
        fontFamily: '"Press Start 2P"',
        fontSize: `${gameOverFontSize}px`,
        fill: "#FFF",
      })
      .setOrigin(0.5);
    gameOverText.setShadow(2, 2, "rgba(0,0,0,0.5)", 2);
  
    // Show final score
    const finalScoreText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, `Score: ${this.score}`, {
        fontFamily: '"Press Start 2P"',
        fontSize: `${buttonFontSize}px`,
        fill: "#FFF",
      })
      .setOrigin(0.5);
    finalScoreText.setShadow(2, 2, "rgba(0,0,0,0.5)", 2);
  

    // Add share button
    const shareButton = this.add
      .text(
        this.scale.width / 2,
        this.scale.height / 2 + 70,
        "Share on Twitter",
        {
          fontFamily: '"Press Start 2P"',
          fontSize: `${buttonFontSize}px`,
          fill: "#FFF",
        }
      )
      .setOrigin(0.5);
    shareButton.setInteractive({ useHandCursor: true });
    shareButton.setShadow(2, 2, "rgba(0,0,0,0.5)", 2);

    const score = this.score;
    shareButton.on("pointerdown", () => {
      const text = `I scored ${score} points in OG Pet Collector Memory Game!`;
      const imageURL = "https://i.imgur.com/EkLer4g.png"; // Replace with your image URL
      const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        text
      )}&url=${encodeURIComponent(
        window.location.href
      )}&hashtags=OGPets,MOOAR&attachment_url=${encodeURIComponent(imageURL)}`;
      window.open(url, "_blank", "noopener,noreferrer");
    });
  

    // Add restart button
    const restartButton = this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 110, "Restart", {
        fontFamily: '"Press Start 2P"',
        fontSize: `${buttonFontSize}px`,
        fill: "#FFF",
      })
      .setOrigin(0.5);
    restartButton.setInteractive({ useHandCursor: true });
    restartButton.setShadow(2, 2, "rgba(0,0,0,0.5)", 2);
    restartButton.on("pointerdown", () => {
      gameOverText.destroy();
      shareButton.destroy();
      restartButton.destroy();
      finalScoreText.destroy(); 
      this.score = 0;
      this.lives = NUM_LIVES;
      this.scoreText.setText("Score: 0");
      this.livesText.setText(`Lives: ${NUM_LIVES}`);
      this.gameOverActive = false;
      this.resetGame();
    });

    // Reset score and lives
    this.score = 0;
    this.lives = NUM_LIVES;

    // Add mouse over effects for shareButton
    shareButton.on("pointerover", () => {
      shareButton.setTint(0x1da1f2);
    });
    shareButton.on("pointerout", () => {
      shareButton.clearTint();
    });

    // Add mouse over effects for restartButton
    restartButton.on("pointerover", () => {
      restartButton.setTint(0xffcc00);
    });
    restartButton.on("pointerout", () => {
      restartButton.clearTint();
    });
  }
}

window.GameScene = GameScene;
