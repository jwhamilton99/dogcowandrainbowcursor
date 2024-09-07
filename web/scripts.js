var playerImage;
var sidekickFrames = [];
var platformStart;
var platformMiddle;
var platformEnd;
var enemyImage;
var pointImage;
var livesImage;
var bulletImage;
var titleImage;
var gameOverImage;
var tutorialImage;

var beginSound;
var shootSound;
var hitSound;
var pointSound;
var hurtSound;
var gameoverSound;
var musicIntroSound;
var musicLoopSound;
var livesIncreaseSound;

var muteImage;
var soundImage;
var musicImage;

var masterOffset = 350;

var scale = 1;

var musicPlaying = true;
var soundsPlaying = true;
var soundMode = 0;

//0=start menu, 1=playing, 2=gameover, 3=tutorial
var gameState = 0;
var waitToRestart = false;

var game;

var mobile = false;
var hiRes = false;

var baseUrl = "web/";

function loadImageWithPromise(path) {
	return new Promise( (resolve)=> {
		let image = new Image();
		image.onload = ()=> {
			resolve(image);
		}
		image.src = path;
	})
}

async function initGame() {
	var mobileFlag = "";
	var hiResFlag = "";
	if(mobile) {
		mobileFlag = "Mobile";
	}
	
	if(hiRes) {
		hiResFlag = "HiRes";
	}
	
	//title
	
	titleImage = await loadImageWithPromise(baseUrl+"images/title"+mobileFlag+hiResFlag+".png");
	// titleImage.src="images/title"+mobileFlag+hiResFlag+".png";
	
	//game over
	gameOverImage = await loadImageWithPromise(baseUrl+"images/gameover"+mobileFlag+hiResFlag+".png");
	
	//player
	playerImage = await loadImageWithPromise(baseUrl+"images/player"+mobileFlag+hiResFlag+".png");
	
	//sidekick
	for(var i = 0; i < ((hiRes) ? 19 : 9); i++) {
		let frame = new Image();
		frame.src = baseUrl+"images/sidekickframes/frame"+(i+1)+hiResFlag+".png";
		sidekickFrames[i] = frame;
	}
	
	//platform
	platformStart = await loadImageWithPromise(baseUrl+"images/platform/start.png");
	
	platformMiddle = await loadImageWithPromise(baseUrl+"images/platform/middle.png");
	
	platformEnd = await loadImageWithPromise(baseUrl+"images/platform/end.png");
	
	//enemies
	enemyImage = await loadImageWithPromise(baseUrl+"images/enemy"+hiResFlag+".png");
	
	//lives
	livesImage = await loadImageWithPromise(baseUrl+"images/lives.png");
	
	//point
	pointImage = await loadImageWithPromise(baseUrl+"images/point"+hiResFlag+".png");

	//bullet
	bulletImage = await loadImageWithPromise(baseUrl+"images/bullet"+hiResFlag+".png");
	
	//tutorial
	tutorialImage = await loadImageWithPromise(baseUrl+"images/tutorial"+mobileFlag+hiResFlag+".png");
	
	//sound
	muteImage = await loadImageWithPromise(baseUrl+"images/soundicons/mute"+mobileFlag+".png");
	soundImage = await loadImageWithPromise(baseUrl+"images/soundicons/sound"+mobileFlag+".png");
	musicImage = await loadImageWithPromise(baseUrl+"images/soundicons/music"+mobileFlag+".png");
	
	//sounds
	beginSound = new Audio(baseUrl+"sounds/begin.mp3");
	shootSound = new Audio(baseUrl+"sounds/shoot.mp3");
	hitSound = new Audio(baseUrl+"sounds/hit.mp3");
	pointSound = new Audio(baseUrl+"sounds/point.mp3");
	hurtSound = new Audio(baseUrl+"sounds/hurt.mp3");
	gameoverSound = new Audio(baseUrl+"sounds/gameover.mp3");
	livesIncreaseSound = new Audio(baseUrl+"sounds/livesincrease.mp3");
	musicIntroSound = new Audio(baseUrl+"sounds/musicintro.mp3");
	musicLoopSound = new Audio(baseUrl+"sounds/musicloop.mp3");
	musicLoopSound.onended = function() {
		musicLoopSound.play();
	}
}

function start() {
	game = new Game();
}

function resizeCanvas() {
	var screenContainer = document.getElementById((mobile) ? "mobileContent" : "screen");
	var screenCanvas = document.getElementById((mobile) ? "mobileScreenCanvas" : "screenCanvas");
	
	if(mobile) {
		screenCanvas.width = screenContainer.clientWidth;
		screenCanvas.height = document.getElementById("mobileContainer").clientHeight-document.getElementById("mobileTop").clientHeight-document.getElementById("mobileDock").clientHeight;
	} else {
		screenCanvas.width = screenContainer.width-40;
		screenCanvas.height = screenContainer.height;
	}
}

class Ground {
	constructor(width) {
		this.isLoading = true
		this.panelWidth = 20*scale;
		this.numPanels = Math.ceil(width/this.panelWidth)+1;
		this.offset = 0;
		this.image = platformMiddle;
		this.incrementAmount = 1;
		this.baseIncrementAmount = 1;
	}
	
	increment() {
		this.offset = ((this.offset+=Math.floor(this.incrementAmount*scale))%this.panelWidth);
	}
}

class Bullet {
	constructor(startX, startY, index) {
		this.dim = 30*scale;
		this.xOffset = (startX-(this.dim));
		this.yOffset = (startY+(this.dim*2));
		this.image = bulletImage;
		this.index = index;
	}
	
	increment() {
		this.xOffset+=7*scale;
		this.yOffset-=1.5*scale;
	}
}

class Sidekick {
	constructor(baseX, baseY) {
		this.baseX = baseX*scale;
		this.baseY = baseY*scale;
		this.dim = 25*scale;
		this.xOffset = 20*scale;
		this.yOffset = 40*scale;
		this.sinOffset = 0;
		this.cycleIndex = 0;
		this.cycleLength = 0.05;
		this.frameIndex = 0;
		this.cooldown = 1;
		this.coolingDown = false;
		this.bullets = [];
		this.frames = sidekickFrames;
	}
	
	increment() {
		if(this.cycleIndex%3 == 0) {
			if(!this.coolingDown) {
				this.frameIndex = ((this.frameIndex+1)%((hiRes) ? 18 : 9));
			} 
		}
		this.cycleIndex++;
		
		this.sinOffset = (10*Math.sin(this.cycleIndex*this.cycleLength))*scale;
	}
	
	currentFrame() {
		return sidekickFrames[this.frameIndex];
	}
	
	shoot(jumpOffset) {
		if(!this.coolingDown) {
			this.bullets.push(new Bullet(this.baseX+this.xOffset, this.baseY+this.yOffset+jumpOffset+this.sinOffset, this.bullets.length));
			var me = this;
			this.coolingDown = true;
			if(soundsPlaying) {
				shootSound.play();
			}
			setTimeout(function(){me.coolingDown = false}, 1000*this.cooldown);
		}
	}
}

class Player {
	constructor() {
		this.sinOffset = 0;
		this.cycleIndex = 0;
		this.cycleLength = 0.1;
		this.score = 0;
		this.gravity = 0.4*scale;
		this.health = 4;
		this.screenXOffset = 50;
		this.yOffset = 0;
		this.yForce = 0;
		this.image = playerImage;
		this.width = 75*scale;
		this.height = this.width*0.78;
		this.currentGroundLevel = 0;
		this.visible = true
		this.rotation = 0;
		this.rotationLimit = 15;
		
		this.sidekick = new Sidekick(this.screenXOffset, this.yOffset);
	}
	
	jump() {
		var jumpForce = 12*scale;
		if(this.yOffset <= this.currentGroundLevel) {
			this.yForce = jumpForce;
			this.rotation = this.rotationLimit;
		}
	}
	
	processY(platforms, width) {
		this.yOffset+=this.yForce;
		this.yForce-=this.gravity;
		if(this.yForce < 0) {
			this.rotation = Math.min(Math.max(this.rotation-=1,-this.rotationLimit),this.rotationLimit);
		}
		
		this.currentlyUnderPlatform = false
		this.currentGroundLevel = 0;
		for(var i = 0; i < platforms.length; i++) {
			if(width-platforms[i].xOffset < this.screenXOffset+this.width && width-platforms[i].xOffset+(platforms[i].panelWidth*platforms[i].numPanels) > this.screenXOffset) {
				if(this.yOffset+this.height >= platforms[i].yOffset) {
					if(this.yOffset > platforms[i].yOffset) {
						this.currentlyUnderPlatform = true
						this.currentGroundLevel = platforms[i].yOffset;
					} else if(this.yForce > 0) {
						this.yOffset = platforms[i].yOffset-platforms[i].panelWidth-this.height;
						this.yForce = 0;
					} else {
						this.currentGroundLevel = platforms[i].yOffset;
					}
				}
			}
		}
		
		if(this.yOffset <= this.currentGroundLevel) {
			this.yForce = 0;
			this.rotation = 0;
			this.yOffset = this.currentGroundLevel;
		}
	}
	
	increment() {
		if(this.yForce == 0) {
			this.cycleIndex++;
			
			this.sinOffset = Math.abs(5*Math.sin(this.cycleIndex*this.cycleLength))*scale;
		} else {
			this.cycleIndex = 0;
			this.sinOffset = 0;
		}
	}
	
	increaseScore(points) {
		for(var i = 1; i <= points; i++) {
			if((this.score+i)%100 == 0) {
				this.health++;
				if(this.health > 5) {
					this.health = 5;
				} else {
					if(soundsPlaying) {
						livesIncreaseSound.play();
					}
				}
				break;
			}
		}
		this.score+=points;
	}
	
	decreaseHealth() {
		this.health--;
		if(this.health == 0) {
			document.getElementById("mobileShootIcon").style.display = "none";
			document.getElementById("mobileMusicIcon").style.display = "none";
			document.getElementById("mobileJumpIcon").style.marginRight = "0";
			document.getElementById("mobileJumpIcon").src = baseUrl+"images/background/ok.png";
			document.getElementById("mobileControlsContainer").style.display = "block";
			waitToRestart = true;
			if(soundsPlaying) {
				musicLoopSound.pause();
				gameoverSound.play();
			}
			gameState = 2;
			setTimeout(function(){
				waitToRestart = false;
			},1000);
		} else {
			if(soundsPlaying) {
				hurtSound.pause();
				hurtSound.currentTime = 0;
				hurtSound.play();
			}
			this.flashHurt(8);
		}
	}
	
	flashHurt(i) {
		if(i > 0) {
			this.visible = !this.visible;
			var me = this;
			setTimeout(function(){me.flashHurt(i-1)}, 50);
		}
	}
}

class Platform {
	constructor(numPanels, level, index) {
		this.numPanels = numPanels;
		this.xOffset = 0;
		this.yOffset = 125*level*scale;
		this.startImage = platformStart;
		this.middleImage = platformMiddle;
		this.endImage = platformEnd;
		this.panelWidth = 20*scale;
		this.index = index;
		this.incrementAmount = 1;
		this.baseIncrementAmount = 1;
	}
	
	iterate() {
		this.xOffset+=this.incrementAmount*scale;
	}
}

class Point {
	constructor(index) {
		this.yOffset = 0;
		this.xOffset = 0;
		this.image = pointImage;
		this.dim = 50*scale;
		this.index = index;
		this.incrementAmount = 1;
		this.baseIncrementAmount = 1;
	}
	
	increment() {
		this.xOffset+=this.incrementAmount*scale;
	}
}

class Enemy {
	constructor(index, level) {
		this.sinOffset = 0;
		this.cycleIndex = 0;
		this.cycleLength = 0.05;
		this.yOffset = 125*level*scale;
		this.xOffset = 0;
		this.image = enemyImage;
		this.dim = 50*scale;
		this.index = index;
		this.baseSpeed = 4;
		this.speed = 4;
	}
	
	increment() {
		this.xOffset+=this.speed*scale;
		this.cycleIndex++;
		
		this.sinOffset = (10*Math.sin(this.cycleIndex*this.cycleLength))*scale;
	}
}

class Game {
	constructor() {
		this.screenCanvas = document.getElementById((mobile) ? "mobileScreenCanvas" : "screenCanvas");
		this.ground = new Ground(this.screenCanvas.width);
		this.player = new Player();
		this.tick = 0;
		this.groundOffset = this.ground.panelWidth-((mobile) ? 10 : 6);
		this.enemies = [];
		this.platforms = [];
		this.points = [];
		this.speed = 1;
		this.pointsRate = 16;
		this.enemiesRate = 4;
		this.resetting = false;
		this.refreshConstant = 10;
		
		document.addEventListener('keydown', (e)=> {
			if(e.code == "Space") {
				this.handleKeySpace(true);
			} else if(e.code == "Enter") {
				this.handleKeyReturn(true);
			} else if(e.code == "KeyM") {
				this.handleKeyM(true);
			}
		});
		
		this.refresh();
	}
	
	handleKeySpace(isTouch) {
		if(mobile && !isTouch) { return }
		switch(gameState) {
			case 0:
				this.tick = 0;
				gameState = 3;
				break;
			case 2:
				if(!waitToRestart) {
					this.resetGame();
				}
				break;
			case 3:
				this.resetGame();
				break;
			default:
				this.player.jump();
				break;
		}
	}
	
	handleKeyReturn(isTouch) {
		if(mobile && !isTouch) { return }
		if(gameState == 1) {
			this.player.sidekick.shoot(this.player.yOffset);
		}
	}
	
	handleKeyM(isTouch) {
		if(mobile && !isTouch) { return }
		soundMode = (soundMode+=1)%3;
		switch(soundMode) {
			case 0:
				soundsPlaying = true;
				musicPlaying = true;
				musicLoopSound.currentTime = 0.0;
				musicLoopSound.play();
				break;
			case 1:
				soundsPlaying = true;
				musicPlaying = false;
				musicLoopSound.pause()
				break;
			default:
				soundsPlaying = false;
				musicPlaying = false;
				musicLoopSound.pause()
				break;
		}
	}
	
	resetGame() {
		this.resetting = true;
		
		document.getElementById("mobileShootIcon").style.display = "block";
		document.getElementById("mobileMusicIcon").style.display = "block";
		document.getElementById("mobileJumpIcon").style.marginRight = "5vw";
		document.getElementById("mobileJumpIcon").src = baseUrl+"images/background/jump.png";
		document.getElementById("mobileControlsContainer").style.display = "flex";
		
		for(var i = 0; i <= this.enemies.length; i++) {
			this.enemies.pop();
		}
		this.enemies = [];
		
		for(var i = 0; i <= this.points.length; i++) {
			this.points.pop();
		}
		this.points = [];
		
		for(var i = 0; i <= this.platforms.length; i++) {
			this.platforms.pop();
		}
		this.platforms = [];
		
		for(var i = 0; i <= this.player.sidekick.bullets.length; i++) {
			this.player.sidekick.bullets.pop();
		}
		this.player.sidekick.bullets = [];
		
		this.player.sidekick.coolingDown = false;
		this.player.sidekick.cooldown = 1;
		
		this.tick = 0;
		this.speed = 1;
		this.enemySpeedOffset = 0;
		this.pointsRate = 16;
		this.enemiesRate = 4;
		this.player.score = 0;
		this.player.health = 4;
		this.player.yOffset = 0;
		this.player.currentGroundLevel = 0;
		this.player.yForce = 0;
		this.resetting = false;
		if(soundsPlaying) {
			beginSound.play();
		}
		if(musicPlaying) {
			musicIntroSound.play();
			musicIntroSound.onended = function() {
				if(musicPlaying) {
					musicLoopSound.currentTime = 0.0;
					musicLoopSound.play();
				}
			}
		}
		gameState = 1;
	}
	
	refresh() {
		var me = this;
		switch(gameState) {
			case 0:
				this.drawMenu();
				break;
			case 2:
				this.drawGameOver();
				break;
			case 3:
				this.drawTutorial();
				break;
			default:
				this.incrementGame()
				this.drawGame();
		}
		setTimeout(function() {me.refresh();},this.refreshConstant);
	}
	
	drawTutorial() {
		var c = this.screenCanvas.getContext("2d");
		c.clearRect(0,0,this.screenCanvas.width, this.screenCanvas.height);
		
		this.drawCenteredProportionalImage(tutorialImage, c);
		
		if(this.tick%200 < 100) {
			c.font = ((mobile) ? "6vw" : "30px")+" Arial";
			c.fillStyle = "red";
			c.textAlign = "right";
			
			if(mobile) {
				c.textAlign = "center";
				c.fillText("Press ✔ To Continue", this.screenCanvas.width*0.5, this.screenCanvas.height-20);
			} else {
				c.fillText("Press Space To Continue", this.screenCanvas.width-20, this.screenCanvas.height-20);
			}
		}
		this.tick++;
	}
	
	generateEnemy() {
		var e = new Enemy(this.enemies.length, 0)
		if(this.platforms.length != 0) {
			var e = new Enemy(this.enemies.length, (Math.floor(Math.random()*2)));
		}
		e.xOffset = -(Math.floor(Math.random()*masterOffset));
		e.speed+=this.speed;
		this.enemies.push(e);
	}
	
	removePlatform(index) {
		for(var e2 = index; e2 < this.platforms.length-1; e2++) {
			this.platforms[e2] = this.platforms[e2+1];
			this.platforms[e2].index--;
		}
		
		this.platforms.pop();
	}
	
	generatePlatform() {
		var length = Math.floor(Math.random()*20)+5;
		var newPlatform = new Platform(length, 1, this.platforms.length);
		newPlatform.xOffset = -(Math.floor(Math.random()*masterOffset));
		newPlatform.incrementAmount+=this.speed;
		this.platforms.push(newPlatform);
		
		var highPoint = new Point(this.points.length);
		highPoint.yOffset = 125*scale;
		highPoint.xOffset = newPlatform.xOffset-(Math.floor(Math.random()*((newPlatform.numPanels*newPlatform.panelWidth)-highPoint.dim)));
		highPoint.incrementAmount+=this.speed;
		this.points.push(highPoint);
		
		if(length > 10) {
			if(Math.floor(Math.random()*3) == 1) {
				var hPlatform = new Platform(Math.floor(Math.random()*(length*0.75)+(Math.floor(length*0.25))),2,this.platforms.length);
				hPlatform.xOffset = newPlatform.xOffset-(Math.floor(Math.random()*5)+2)*hPlatform.panelWidth;
				hPlatform.incrementAmount+=this.speed;
				this.platforms.push(hPlatform);
				
				if(Math.floor(Math.random()*5)<=2) {
					var higherPoint = new Point(this.points.length);
					higherPoint.yOffset = 125*2*scale;
					higherPoint.xOffset = hPlatform.xOffset-(((hPlatform.numPanels*hPlatform.panelWidth)-higherPoint.dim)/2);
					higherPoint.incrementAmount+=this.speed;
					this.points.push(higherPoint);
				}
			}
		}
	}
	
	checkCollision(player, enemy) {
		if((this.screenCanvas.width-enemy.xOffset < player.screenXOffset+player.width && this.screenCanvas.width-enemy.xOffset > player.screenXOffset) || (this.screenCanvas.width-enemy.xOffset+enemy.dim < player.screenXOffset+player.width && this.screenCanvas.width-enemy.xOffset+enemy.dim > player.screenXOffset)) {
			if((enemy.yOffset < player.yOffset && enemy.yOffset > player.yOffset-player.height) || (enemy.yOffset-enemy.dim < player.yOffset && enemy.yOffset-enemy.dim > player.yOffset-player.height)) {
				this.removeEnemy(enemy.index);
				player.decreaseHealth();
				return true;
			}
		}
		return false;
	}
	
	generatePoint() {
		var newPoint = new Point(this.points.length);
		newPoint.xOffset = -(Math.floor(Math.random()*masterOffset));
		newPoint.incrementAmount+=this.speed;
		this.points.push(newPoint);
	}
	
	removePoint(index) {
		for(var e2 = index; e2 < this.points.length-1; e2++) {
			this.points[e2] = this.points[e2+1];
			this.points[e2].index--;
		}
		
		this.points.pop();
	}
	
	checkPointCollision(player, point) {
		if((this.screenCanvas.width-point.xOffset < player.screenXOffset+player.width && this.screenCanvas.width-point.xOffset > player.screenXOffset) || (this.screenCanvas.width-point.xOffset+point.dim < player.screenXOffset+player.width && this.screenCanvas.width-point.xOffset+point.dim > player.screenXOffset)) {
			if((point.yOffset < player.yOffset && point.yOffset > player.yOffset-player.height) || (point.yOffset-point.dim < player.yOffset && point.yOffset-point.dim > player.yOffset-player.height)) {
				this.removePoint(point.index);
				player.increaseScore(10);
				if(soundsPlaying) {
					pointSound.pause();
					pointSound.currentTime = 0;
					pointSound.play();
				}
				return true;
			}
		}
		return false;
	}
	
	checkBulletCollision(bullets, enemy) {
		for(var b = 0; b < bullets.length; b++) {
			if(bullets[b].xOffset+bullets[b].dim > this.screenCanvas.width-enemy.xOffset && bullets[b].xOffset < this.screenCanvas.width-enemy.xOffset+enemy.dim) {
				if(bullets[b].yOffset-bullets[b].dim < enemy.yOffset+enemy.dim && bullets[b].yOffset > enemy.yOffset) {
					this.removeEnemy(enemy.index);
					this.removeBullet(bullets[b].index);
					this.player.increaseScore(5);
					if(soundsPlaying) {
						hitSound.pause();
						hitSound.currentTime = 0;
						hitSound.play();
					}
					return true;
				}
			}
		}
		return false;
	}
	
	removeBullet(index) {
		for(var e2 = index; e2 < this.player.sidekick.bullets.length-1; e2++) {
			this.player.sidekick.bullets[e2] = this.player.sidekick.bullets[e2+1];
			this.player.sidekick.bullets[e2].index--;
		}
		
		this.player.sidekick.bullets.pop();
	}
	
	removeEnemy(index) {
		for(var e2 = index; e2 < this.enemies.length-1; e2++) {
			this.enemies[e2] = this.enemies[e2+1];
			this.enemies[e2].index--;
		}
		
		this.enemies.pop();
	}
	
	incrementGame() {
		this.tick++;
		var rateOffset = (this.speed+3)/4;
		
		if(this.tick%4000 == 0) {
			this.speed = Math.min(this.speed+=1, 4);
			
			this.enemiesRate = Math.max(this.enemiesRate-=1, 2);
			
			this.pointsRate = Math.min(this.pointsRate+=1, 20);
			
			this.player.sidekick.cooldown = Math.max(this.player.sidekick.cooldown-0.2, 0.2);
			
			for(var i = 0; i < this.enemies.length; i++) {
				this.enemies[i].speed = this.enemies[i].baseSpeed+this.speed;
			}
			
			for(var i = 0; i < this.points.length; i++) {
				this.points[i].incrementAmount = this.points[i].baseIncrementAmount+this.speed;
			}
			
			for(var i = 0; i < this.platforms.length; i++) {
				this.platforms[i].incrementAmount = this.platforms[i].baseIncrementAmount+this.speed;
			}
		}
		
		if(this.tick%Math.round(500/rateOffset) == 0) {
			if(Math.floor(Math.random()*10) <= 3) {
				this.generatePlatform();
			}
		}
		
		if(this.tick%Math.round(100/rateOffset) == 0) {
			if(Math.floor(Math.random()*this.enemiesRate)==1) {
				this.generateEnemy();
			}
			if(Math.floor(Math.random()*this.pointsRate) == 1) {
				this.generatePoint();
			}
		}
		
		if(this.tick%50 == 0) {
			this.player.increaseScore(1);
		}
		
		if(!this.resetting) {
			for(var e = 0; e < this.enemies.length; e++) {
				this.enemies[e].increment();
				if(!this.checkCollision(this.player, this.enemies[e]) && !this.checkBulletCollision(this.player.sidekick.bullets, this.enemies[e])) {
					if(this.screenCanvas.width-(this.enemies[e].xOffset-this.enemies[e].dim) < 0) {
						this.removeEnemy(e);
					}
				}
			}
			
			for(var p = 0; p < this.platforms.length; p++) {
				this.platforms[p].iterate();
				if(this.screenCanvas.width-this.platforms[p].xOffset+(this.platforms[p].panelWidth*this.platforms[p].numPanels) < 0) {
					this.removePlatform(this.platforms[p].index);
				}
			}
			
			for(var p = 0; p < this.points.length; p++) {
				this.points[p].increment();
				if(!this.checkPointCollision(this.player , this.points[p])) {
					if(this.screenCanvas.width-(this.points[p].xOffset-this.points[p].dim) < 0) {
						this.removePoint(p);
					}
				}
			}
		}
		
		this.ground.incrementAmount = 1+this.speed;
		this.ground.increment();
		this.player.processY(this.platforms, this.screenCanvas.width);
		this.player.sidekick.increment();
		if(!this.resetting) {
			for(var b = 0; b < this.player.sidekick.bullets.length; b++) {
				this.player.sidekick.bullets[b].increment();
				if(this.player.sidekick.bullets[b].xOffset > this.screenCanvas.width || this.screenCanvas.height-this.groundOffset-this.player.sidekick.bullets[b].yOffset > this.screenCanvas.height) {
					this.removeBullet(this.player.sidekick.bullets[b].index);
				}
			}
		}
		this.player.increment();
	}
	
	drawCenteredProportionalImage(image, context) {
		var imageHeight = 0;
		var imageWidth = 0;
		var x = 0;
		var y = 0;
		
		imageHeight = ((this.screenCanvas.width*image.height)/image.width);
		imageWidth = (this.screenCanvas.width);
		y = (this.screenCanvas.height/2)-(imageHeight/2);
		
		context.drawImage(image, x, y, imageWidth, imageHeight);
	}
	
	drawMenu() {
		var c = this.screenCanvas.getContext("2d");
		c.clearRect(0,0,this.screenCanvas.width, this.screenCanvas.height);
		
		this.drawCenteredProportionalImage(titleImage, c);
		
		if(this.tick%200 < 100) {
			c.font = ((mobile) ? "6vw" : "30px")+" Arial";
			c.fillStyle = "red";
			c.textAlign = "center";
			if(mobile) {
				c.fillText("Press ✔ To Start", this.screenCanvas.width*0.5, this.screenCanvas.height-20);
			} else {
				c.fillText("Press Space To Start", this.screenCanvas.width*0.5-50, this.screenCanvas.height-20);
			}
		}
		this.tick = (this.tick+=1)%200;
	}
	
	drawGameOver() {
		var c = this.screenCanvas.getContext("2d");
		c.clearRect(0,0,this.screenCanvas.width, this.screenCanvas.height);
		
		this.drawCenteredProportionalImage(gameOverImage, c);
		
		c.font = ((mobile) ? "6vw" : "30px")+" Arial";
		if(mobile) {
			c.fillStyle = "white";
			c.textAlign = "center";
			c.fillText("Your Score: "+this.player.score, this.screenCanvas.width/2, this.screenCanvas.height-20);
		} else {
			c.fillStyle = "black";
			c.textAlign = "right";
			c.fillText("Your Score: "+this.player.score, this.screenCanvas.width-10, 30);
		}
	}
	
	drawGame() {
		var c = this.screenCanvas.getContext("2d");
		c.clearRect(0,0,this.screenCanvas.width, this.screenCanvas.height);
		c.fillStyle = (mobile) ? "white" : "black";
		
		//draw player
		if(this.player.visible) {
			c.save();
			c.translate((this.player.screenXOffset+(this.player.width/2)), ((this.screenCanvas.height-this.groundOffset-this.player.height-this.player.yOffset-this.player.sinOffset)+(this.player.height/2)));
			c.rotate(-this.player.rotation*(Math.PI/180));
			c.drawImage(this.player.image, -this.player.width/2, -this.player.height/2, this.player.width, this.player.height);
			// c.drawImage(this.player.image, this.player.screenXOffset, this.screenCanvas.height-this.groundOffset-this.player.height-this.player.yOffset-this.player.sinOffset, this.player.width, this.player.height);
			c.restore();
		}
		
		//draw bullets
		for(var b = 0; b < this.player.sidekick.bullets.length; b++) {
			var currentBullet = this.player.sidekick.bullets[b];
			
			c.drawImage(currentBullet.image, currentBullet.xOffset, this.screenCanvas.height-this.groundOffset-currentBullet.yOffset, currentBullet.dim, currentBullet.dim);
		}
		
		//draw sidekick
		c.drawImage(this.player.sidekick.currentFrame(), this.player.screenXOffset-this.player.sidekick.xOffset, this.screenCanvas.height-this.groundOffset-this.player.height-this.player.yOffset-this.player.sidekick.yOffset-this.player.sidekick.sinOffset, this.player.sidekick.dim, this.player.sidekick.dim);
		
		//draw platforms
		for(var p = 0; p < this.platforms.length; p++) {
			c.drawImage(this.platforms[p].startImage, this.screenCanvas.width-this.platforms[p].xOffset, (this.screenCanvas.height-this.groundOffset)-this.platforms[p].yOffset, this.platforms[p].panelWidth, this.platforms[p].panelWidth);
			for(var panelI = 0; panelI < this.platforms[p].numPanels-2; panelI++) {
				c.drawImage(this.platforms[p].middleImage, this.screenCanvas.width+(this.platforms[p].panelWidth*(panelI+1))-this.platforms[p].xOffset, (this.screenCanvas.height-this.groundOffset)-this.platforms[p].yOffset, this.platforms[p].panelWidth, this.platforms[p].panelWidth);
			}
			c.drawImage(this.platforms[p].endImage, this.screenCanvas.width+(this.platforms[p].panelWidth*(this.platforms[p].numPanels-1))-this.platforms[p].xOffset, (this.screenCanvas.height-this.groundOffset)-this.platforms[p].yOffset, this.platforms[p].panelWidth, this.platforms[p].panelWidth);
		}
		
		//draw points
		for(var p = 0; p < this.points.length; p++) {
			c.drawImage(this.points[p].image, this.screenCanvas.width-this.points[p].xOffset, this.screenCanvas.height-this.groundOffset-this.points[p].dim-this.points[p].yOffset, this.points[p].dim, this.points[p].dim);
		}
		
		//draw enemies
		for(var e = 0; e < this.enemies.length; e++) {
			c.drawImage(this.enemies[e].image, this.screenCanvas.width-this.enemies[e].xOffset, this.screenCanvas.height-this.groundOffset-this.enemies[e].dim-this.enemies[e].yOffset-this.enemies[e].sinOffset-10, this.enemies[e].dim, this.enemies[e].dim);
		}
		
		//draw ground
		for(var gI = 0; gI < this.ground.numPanels; gI++) {
			c.drawImage(this.ground.image, this.ground.panelWidth*gI-this.ground.offset, this.screenCanvas.height-this.groundOffset, this.ground.panelWidth, this.ground.panelWidth);
		}
		
		//draw lives
		var livesWidth = 30*scale;
		for(var l = 0; l <= this.player.health; l++) {
			c.drawImage(livesImage, this.screenCanvas.width-livesWidth*l,2,livesWidth,livesWidth);
		}
		
		//draw score
		c.font = ((mobile) ? "6vw" : "20px")+" Arial";
		c.textAlign = "right";
		c.fillText("Score: "+this.player.score, this.screenCanvas.width-5, 55*scale+((mobile) ? 10 : 0));
		
		//draw sound mode
		var x = 5;
		var y = 5;
		var dim = 25*scale;
		switch(soundMode) {
			case 0:
				c.drawImage(musicImage, x, y, dim, dim);
				break;
			case 1:
				c.drawImage(soundImage, x, y, dim, dim);
				break;
			default:
				c.drawImage(muteImage, x, y, dim, dim);
				break;
		}
	}
}

var resizeLock = false;

window.onresize = function() {
	handleResize();
}

function handleResize() {
	resizeCanvas();
	if(!resizeLock) {
		resizeLock = true;
		if(window.innerWidth < window.innerHeight) {
			if(!mobile) {
				if(confirm("You're in portrait! The site needs to be refreshed to switch to the mobile layout.")) {
					
					window.location = window.location;
				} else {
					
					window.location = window.location;
				}
			}
		} else {
			if(mobile) {
				if(confirm("You're in portrait! The site needs to be refreshed to switch to the mobile layout.")) {
					
					window.location = window.location;
				} else {
					window.location = window.location;
				}
					
			}
		}
	} else {
		resizeLock = false;
	}
}

window.oncontextmenu = function(e) {
	e.preventDefault();
	e.stopPropagation();
}

function switchToHiResMode() {
	if(hiRes) { return }
	if(gameState == 0) {
		if(confirm("Switch to Ventura Mode?")) {
			window.location = window.location+"?ventura"
		}
	}
}

window.onload = async function() {
	if(window.location.href.includes("ventura")) {
		hiRes = true;
	}
	
	if(window.innerWidth < window.innerHeight) {
		mobile = true;
		scale = Math.min(Math.floor(window.innerWidth/275), 2);
		document.getElementById("container").style.display = "none";
		document.getElementById("mobileContainer").style.display = "flex";
	}
	
	await initGame();
	document.getElementById("loadingBlock").style.display = "none";
	handleResize() 
	start();
}
