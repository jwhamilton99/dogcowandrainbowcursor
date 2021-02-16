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

//0=start menu, 1=playing, 2=gameover, 3=tutorial
var gameState = 0;
var waitToRestart = false;

var game;

function initGame() {
	//title
	titleImage = new Image();
	titleImage.src="images/title.png";
	
	//game over
	gameOverImage = new Image();
	gameOverImage.src = "images/gameover.png";
	
	//player
	playerImage = new Image();
	playerImage.src = "images/player.png";
	
	//sidekick
	for(var i = 0; i < 9; i++) {
		sidekickFrames[i] = new Image();
		sidekickFrames[i].src = "images/sidekickframes/frame"+(i+1)+".png";
	}
	
	//platform
	platformStart = new Image();
	platformStart.src = "images/platform/start.png";
	
	platformMiddle = new Image()
	platformMiddle.src = "images/platform/middle.png";
	
	platformEnd = new Image();
	platformEnd.src = "images/platform/end.png";
	
	//enemies
	enemyImage = new Image();
	enemyImage.src = "images/enemy.png";
	fastEnemyImage = new Image();
	
	//lives
	livesImage = new Image();
	livesImage.src = "images/lives.png";
	
	//point
	pointImage = new Image();
	pointImage.src = "images/point.png";

	//bullet
	bulletImage = new Image();
	bulletImage.src = "images/bullet.png";
	
	//tutorial
	tutorialImage = new Image();
	tutorialImage.src = "images/tutorial.png";
}

function start() {
	game = new Game();
}

function resizeCanvas() {
	var screenContainer = document.getElementById("screen");
	var screenCanvas = document.getElementById("screenCanvas");
	
	screenCanvas.width = screenContainer.width-40;
	screenCanvas.height = screenContainer.height;
}

class Ground {
	constructor(width) {
		this.isLoading = true
		this.panelWidth = 20;
		this.numPanels = Math.ceil(width/this.panelWidth)+1;
		this.offset = 0;
		this.image = platformMiddle;
	}
	
	increment() {
		this.offset = (this.offset+=2)%this.panelWidth;
	}
}

class Bullet {
	constructor(startX, startY, index) {
		this.dim = 30;
		this.xOffset = startX-(this.dim);
		this.yOffset = startY+(this.dim*2);
		this.image = bulletImage;
		this.index = index;
	}
	
	increment() {
		this.xOffset+=7;
		this.yOffset-=1.5;
	}
}

class Sidekick {
	constructor(baseX, baseY) {
		this.baseX = baseX;
		this.baseY = baseY;
		this.dim = 25;
		this.xOffset = 20;
		this.yOffset = 40;
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
				this.frameIndex = ((this.frameIndex+=1)%9);
			}
		}
		this.cycleIndex++;
		
		this.sinOffset = 10*Math.sin(this.cycleIndex*this.cycleLength);
	}
	
	currentFrame() {
		return this.frames[this.frameIndex];
	}
	
	shoot(jumpOffset) {
		if(!this.coolingDown) {
			this.bullets.push(new Bullet(this.baseX+this.xOffset, this.baseY+this.yOffset+jumpOffset));
			var me = this;
			this.coolingDown = true;
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
		this.gravity = 0.4;
		this.health = 4;
		this.screenXOffset = 100;
		this.yOffset = 0;
		this.yForce = 0;
		this.image = playerImage;
		this.width = 75;
		this.height = this.width*0.78;
		this.currentGroundLevel = 0;
		this.visible = true
		
		this.sidekick = new Sidekick(this.screenXOffset, this.yOffset);
	}
	
	jump() {
		var jumpForce = 12;
		if(this.yOffset <= this.currentGroundLevel) {
			this.yForce = jumpForce;
		}
	}
	
	processY(platforms, width) {
		this.yOffset+=this.yForce;
		this.yForce-=this.gravity;
		
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
			this.yOffset = this.currentGroundLevel;
		}
	}
	
	increment() {
		if(this.yForce == 0) {
			if(this.cycleIndex%3 == 0) {
				this.frameIndex = ((this.frameIndex+=1)%9);
			}
			this.cycleIndex++;
			
			this.sinOffset = Math.abs(5*Math.sin(this.cycleIndex*this.cycleLength));
		} else {
			this.cycleIndex = 0;
			this.sinOffset = 0;
		}
	}
	
	increaseScore(points) {
		for(var i = 1; i <= points; i++) {
			if((this.score+i)%100 == 0) {
				this.health++;
				if(this.health > 4) {
					this.health = 4;
				}
				break;
			}
		}
		this.score+=points;
	}
	
	decreaseHealth() {
		this.health--;
		if(this.health == 0) {
			waitToRestart = true;
			gameState = 2;
			setTimeout(function(){
				waitToRestart = false;
			},1000);
		} else {
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
		this.yOffset = 125*level;
		this.startImage = platformStart;
		this.middleImage = platformMiddle;
		this.endImage = platformEnd;
		this.panelWidth = 20;
		this.index = index;
	}
	
	iterate() {
		this.xOffset+=2;
	}
}

class Point {
	constructor(index) {
		this.yOffset = 0;
		this.xOffset = 0;
		this.image = pointImage;
		this.dim = 50;
		this.index = index;
	}
	
	increment() {
		this.xOffset+=2;
	}
}

class Enemy {
	constructor(index, level) {
		this.sinOffset = 0;
		this.cycleIndex = 0;
		this.cycleLength = 0.05;
		this.yOffset = 125*level;
		this.xOffset = 0;
		this.image = enemyImage;
		this.dim = 50;
		this.index = index;
		this.speed = 4;
	}
	
	increment() {
		this.xOffset+=this.speed;
		if(this.cycleIndex%3 == 0) {
			this.frameIndex = ((this.frameIndex+=1)%9);
		}
		this.cycleIndex++;
		
		this.sinOffset = 10*Math.sin(this.cycleIndex*this.cycleLength);
	}
}

class Game {
	constructor() {
		this.screenCanvas = document.getElementById("screenCanvas");
		this.ground = new Ground(this.screenCanvas.width);
		this.player = new Player();
		this.tick = 0;
		this.groundOffset = this.ground.panelWidth-6;
		this.enemies = [];
		this.platforms = [];
		this.points = [];
		this.speed = 10;
		this.pointsRate = 16;
		this.enemiesRate = 4;
		this.resetting = false;
		
		document.addEventListener('keydown', (e)=> {
			if(e.code == "Space") {
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
			} else if(e.code == "Enter") {
				if(gameState == 1) {
					this.player.sidekick.shoot(this.player.yOffset);
				}
			}
		});
		
		this.refresh();
	}
	
	resetGame() {
		this.resetting = true;
		for(var i = 0; i <= this.enemies.length; i++) {
			this.enemies.pop();
		}
		
		for(var i = 0; i <= this.points.length; i++) {
			this.points.pop();
		}
		
		for(var i = 0; i <= this.platforms.length; i++) {
			this.platforms.pop();
		}
		
		for(var i = 0; i <= this.player.sidekick.bullets.length; i++) {
			this.player.sidekick.bullets.pop();
		}
		
		this.player.sidekick.coolingDown = false;
		this.player.sidekick.cooldown = 1;
		
		this.tick = 0;
		this.speed = 10;
		this.enemySpeedOffset = 0;
		this.pointsRate = 16;
		this.enemiesRate = 4;
		this.player.score = 0;
		this.player.health = 4;
		this.player.yOffset = 0;
		this.player.currentGroundLevel = 0;
		this.player.yForce = 0;
		this.resetting = false;
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
		setTimeout(function() {me.refresh();},this.speed);
	}
	
	drawTutorial() {
		var c = screenCanvas.getContext("2d");
		c.clearRect(0,0,screenCanvas.width, screenCanvas.height);
		
		c.drawImage(tutorialImage, 0,0,this.screenCanvas.width, this.screenCanvas.height);
		
		if(this.tick%200 < 100) {
			c.font = "30px Arial";
			c.fillStyle = "red";
			c.textAlign = "right";
			c.fillText("Press Space To Continue", this.screenCanvas.width-20, this.screenCanvas.height-20);
		}
		this.tick++;
	}
	
	generateEnemy() {
		if(this.platforms.length != 0) {
			var e = new Enemy(this.enemies.length, (Math.floor(Math.random()*2)));
			e.speed+=this.enemySpeedOffset;
			this.enemies.push(e);
		} else {
			var e = new Enemy(this.enemies.length, 0)
			e.speed+=this.enemySpeedOffset;
			this.enemies.push(e);
		}
	}
	
	removePlatform(index) {
		for(var e2 = index; e2 < this.platforms.length-1; e2++) {
			this.platforms[e2] = this.platforms[e2+1];
		}
		
		this.platforms.pop();
		
		if(this.platforms.length != 0) {
			for(var e2 = index; e2 < this.platforms.length; e2++) {
				this.platforms[e2].index--;
			}
		}
	}
	
	generatePlatform() {
		var length = Math.floor(Math.random()*20)+5
		var newPlatform = new Platform(length, 1, this.platforms.length)
		this.platforms.push(newPlatform);
		
		var highPoint = new Point(this.points.length);
		highPoint.yOffset = 125;
		highPoint.xOffset = -(Math.floor(Math.random()*(newPlatform.numPanels*newPlatform.panelWidth)))+newPlatform.xOffset;
		this.points.push(highPoint);
		
		if(length > 10) {
			if(Math.floor(Math.random()*3) == 1) {
				var hPlatform = new Platform(Math.floor(Math.random()*(length*0.75)+(Math.floor(length*0.25))),2,this.platforms.length);
				hPlatform.xOffset = -(Math.floor(Math.random()*5)+2)*hPlatform.panelWidth;
				this.platforms.push(hPlatform);
				
				if(Math.floor(Math.random()*5)<=2) {
					var higherPoint = new Point(this.points.length);
					higherPoint.yOffset = 125*2;
					higherPoint.xOffset = -(hPlatform.xOffset+(hPlatform.numPanels*hPlatform.panelWidth))/2;
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
		this.points.push(new Point(this.points.length));
	}
	
	removePoint(index) {
		for(var e2 = index; e2 < this.points.length-1; e2++) {
			this.points[e2] = this.points[e2+1];
		}
		
		this.points.pop();
		
		if(this.points.length != 0) {
			for(var e2 = index; e2 < this.points.length; e2++) {
				this.points[e2].index--;
			}
		}
	}
	
	checkPointCollision(player, point) {
		if((this.screenCanvas.width-point.xOffset < player.screenXOffset+player.width && this.screenCanvas.width-point.xOffset > player.screenXOffset) || (this.screenCanvas.width-point.xOffset+point.dim < player.screenXOffset+player.width && this.screenCanvas.width-point.xOffset+point.dim > player.screenXOffset)) {
			if((point.yOffset < player.yOffset && point.yOffset > player.yOffset-player.height) || (point.yOffset-point.dim < player.yOffset && point.yOffset-point.dim > player.yOffset-player.height)) {
				this.removePoint(point.index);
				player.increaseScore(10);
				return true;
			}
		}
		return false;
	}
	
	checkBulletCollision(bullets, enemy) {
		for(var b = 0; b < bullets.length; b++) {
			if(bullets[b].xOffset > this.screenCanvas.width-enemy.xOffset) {
				if(bullets[b].yOffset < enemy.yOffset+enemy.dim && bullets[b].yOffset > enemy.yOffset) {
					this.removeEnemy(enemy.index);
					this.removeBullet(bullets[b].index);
					this.player.increaseScore(5);
					return true;
				}
			}
		}
		return false;
	}
	
	removeBullet(index) {
		for(var e2 = index; e2 < this.player.sidekick.bullets.length-1; e2++) {
			this.player.sidekick.bullets[e2] = this.player.sidekick.bullets[e2+1];
		}
		
		this.player.sidekick.bullets.pop();
		
		if(this.player.sidekick.bullets.length != 0) {
			for(var e2 = index; e2 < this.player.sidekick.bullets.length; e2++) {
				this.player.sidekick.bullets[e2].index--;
			}
		}
	}
	
	removeEnemy(index) {
		for(var e2 = index; e2 < this.enemies.length-1; e2++) {
			this.enemies[e2] = this.enemies[e2+1];
		}
		
		this.enemies.pop();
		
		if(this.enemies.length != 0) {
			for(var e2 = index; e2 < this.enemies.length; e2++) {
				this.enemies[e2].index--;
			}
		}
	}
	
	incrementGame() {
		this.tick++;
		
		if(this.tick%10000 == 0) {
			this.enemySpeedOffset++;
			if(this.enemySpeedOffset > 10) {
				this.enemySpeedOffset = 10;
			}
			this.speed--;
			if(this.speed < 1) {
				this.speed = 1;
			}
			this.enemiesRate--;
			if(this.enemiesRate < 2) {
				this.enemiesRate = 2;
			}
			this.pointsRate++;
			if(this.pointsRate > 20) {
				this.pointsRate = 20;
			}
			this.player.sidekick.cooldown-=0.2;
			if(this.player.sidekick.cooldown < 0.2) {
				this.player.sidekick.cooldown = 0.2;
			}
		}
		
		if(this.tick%500 == 0) {
			if(Math.floor(Math.random()*10) <= 3) {
				this.generatePlatform();
			}
		}
		
		if(this.tick%100 == 0) {
			if(Math.floor(Math.random()*this.enemiesRate)==1) {
				this.generateEnemy();
				
			}
			if(Math.floor(Math.random()*this.pointsRate) == 10) {
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
	
	drawMenu() {
		var c = screenCanvas.getContext("2d");
		c.clearRect(0,0,screenCanvas.width, screenCanvas.height);
		
		c.drawImage(titleImage, 0,0,this.screenCanvas.width, this.screenCanvas.height);
		
		if(this.tick%200 < 100) {
			c.font = "30px Arial";
			c.fillStyle = "red";
			c.textAlign = "center";
			c.fillText("Press Space To Start", this.screenCanvas.width*0.5-50, this.screenCanvas.height-20);
		}
		this.tick++;
	}
	
	drawGameOver() {
		var c = screenCanvas.getContext("2d");
		c.clearRect(0,0,screenCanvas.width, screenCanvas.height);
		
		c.drawImage(gameOverImage, 0,0,this.screenCanvas.width, this.screenCanvas.height);
		
		c.font = "20px Arial";
		c.fillStyle = "black";
		c.textAlign = "right";
		c.fillText("Your Score: "+this.player.score, this.screenCanvas.width-10, 30);
	}
	
	drawGame() {
		var c = screenCanvas.getContext("2d");
		c.clearRect(0,0,screenCanvas.width, screenCanvas.height);
		c.fillStyle = "black";
		
		//draw player
		if(this.player.visible) {
			c.drawImage(this.player.image, this.player.screenXOffset, this.screenCanvas.height-this.groundOffset-this.player.height-this.player.yOffset-this.player.sinOffset, this.player.width, this.player.height);
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
		var livesWidth = 30;
		for(var l = 0; l <= this.player.health; l++) {
			c.drawImage(livesImage, this.screenCanvas.width-livesWidth*l,2,livesWidth,livesWidth);
		}
		c.font = "20px Arial";
		c.textAlign = "right";
		c.fillText("Score: "+this.player.score, this.screenCanvas.width-5, 55);
		
	}
}

var resizeLock = false;

window.onresize = function() {
	resizeCanvas();
	if(window.innerWidth < 500) {
		if(!resizeLock) {
			window.alert("this game does not work on mobile or on small screens. please only use a desktop. sorry about that");
			resizeLock = true;
		}
	} else {
		if(resizeLock) {
			resizeLock = false;
		}
	}
}

window.onload = function() {
	initGame();
	resizeCanvas();
	start();
	if(window.innerWidth < 500) {
		window.alert("this game does not work on mobile or on small screens. please only use a desktop. sorry about that");
		resizeLock = true;
	}
}
