import kaboom from "kaboom"
import "./anticheat"
import "../auth_lib.js"

window.game_version = {
  name: "Version 1.1",
  id: "v1.1",
  channel: "stable"
}

if(typeof window.anticheat != "object" || typeof window.anticheat.checkMain != "function" || (delete window.anticheat)){
  alert("Failed to detect anticheat!")
  document.getElementsByTagName("canvas")[0].remove()
  throw new Error("Anticheat failed to load")
}

window.mobile = false
if (navigator.userAgent.match(/Android/i)
  || navigator.userAgent.match(/webOS/i)
  || navigator.userAgent.match(/iPhone/i)
  || navigator.userAgent.match(/iPad/i)
  || navigator.userAgent.match(/iPod/i)
  || navigator.userAgent.match(/BlackBerry/i)
  || navigator.userAgent.match(/Windows Phone/i)) {
  mobile = true
  // alert("This game is not compatable with mobile")
  // history.back()
}

// debug
Object.defineProperty(window, "debugMode", {
  value: (localStorage.channel == "dev-dangerous-only-enable-if-you-know-what-youre-doing"),
  writable: false,
  enumerable: true,
  configurable: false
})

kaboom({
  background: [18, 215, 255],
  width: 641,
  height: 522,
  debug: debugMode
});

// sound patch
window.playingsounds = []
window.oldPlay = window.play
window.play = function(name, args){
  var s = oldPlay(name, args)
  window.playingsounds.push(s)
  return s
}
window.stopSounds = function(){
  if(playingsounds.length > 0){
    playingsounds.forEach(function(sound){
      if(sound && sound.hasOwnProperty("stop")){
        sound.stop()
      }
    })
  }
  playingsounds = []
}
// scene switch patch
window.currentScene = ""
window.oldGo = window.go
window.events = []
window.go = function(a, b, c, d, e, f, g){
  window.currentScene = a
  stopSounds()
  events.forEach((evt) => {
    window.removeEventListener(evt[0], evt[1])
  })
  events = []
  if(["game", "died", "win"].indexOf(a) > -1){
    document.getElementsByTagName('canvas')[0].className = "noCursor"
  }else{
    document.getElementsByTagName('canvas')[0].className = ""
  }
  if(["game"].indexOf(currentScene) == -1){
    inventory = []
  }
  return oldGo(a, b, c, d, e, f, g)
}

// game data (achievements)
import "./gamedata.js"

window.anticheat.setHooks()

// Parse saved settings
window.settings = {
  enableControllers: false
}
if(localStorage.hasOwnProperty('settings')){
  window.settings = JSON.parse(localStorage.settings)
}

// controller setup
if(window.settings.enableControllers){
  Controller.search({
    settings: {
      useAnalogAsDpad: "left"
    }
  })
}

// load assets
const assets = [
  "player",
  "playerCrouch",
  "barrier",
  "halfBarrier",
  "ground",
  "dirt",
  "goal"
]
const images = [
  "dirtguy",
  "trollface",
  "mrbeast",
  "discord",
  "guilded",
  "revolt"
]
const misc_assets = [
  "up",
  "down",
  "left",
  "right"
]
const sounds = [
  "death",
  "dirtdeath",
  "trollfaceDie",
  "mrbeast",
  "mrbeastdeath",
  "win",
  "achievement",
  "ohmygod",
  "banish",
  "load",
  "game",
]
loadRoot("sprites/")
assets.forEach((asset) => {
  loadPedit(asset, `${asset}.pedit`);
});
images.forEach((asset) => {
  loadSprite(asset, `${asset}.png`);
});
loadRoot("misc_assets/")
misc_assets.forEach((asset) => {
  loadSprite(asset, `${asset}.png`);
});
loadRoot("sounds/")
sounds.forEach((sound) => {
  loadSound(sound, `${sound}.mp3`)
});

// custom components
window.patrol = function(distance = 100, speed = 64, dir = -1) {
  return {
    id: "patrol",
    require: ["pos", "area"],
    startingPos: vec2(0, 0),
    add() {
      this.startingPos = this.pos;
      this.on("collide", (obj, collision) => {
        // if (side === "left" || side === "right") {
        //   dir = -dir;
        // }
        if(!obj.is("player") && !collision.isBottom()){
          dir = -dir;
        }else{
          // nothing (this is just here because it bugs out without it idk why)
        }
      });
    },
    update() {
      if(this.pos.y > 512){
        this.destroy()
      }
      if (Math.abs(this.pos.x - this.startingPos.x) >= distance) {
        dir = -dir;
      }
      this.move(speed * dir, 0);
    },
  };
}

window.enemyKillable = function() {
  return {
    id: "enemy",
    require: ["pos", "area", "sprite", "patrol"],
    isAlive: true,
    update() {},
    kill(time=0.1, fade=0.1, playSound=true) {
      this.isAlive = false;
      this.unuse("patrol")
      this.unuse("body")
      this.unuse("solid")
      this.stop();
      // this.area.width = 16;
      // this.area.height = 8;
      if(playSound){
        var omg = play("ohmygod")
      }
      this.use(lifespan(time, { fade: fade }))
    },
  };
}

window.addButton = function(txt, p, f, disabled=false, disabledTxt="") {
  if(disabled){
    txt += (" " + disabledTxt)
  }
	const btn = add([
		text(txt, {
			size: 32
		}),
		pos(p),
		area({
			cursor: "pointer",
		}),
		scale(1),
		origin("center"),
	])

  if(!disabled){
  	btn.onClick(f)
  }

  btn.onUpdate(() => {
  	if (btn.isHovering() && !disabled) {
      if(mobile){
        f()
      }
  		const t = time() * 10
  		btn.color = rgb(
				wave(0, 255, t),
  			wave(0, 255, t + 2),
  			wave(0, 255, t + 4),
  		)
  		btn.scale = vec2(1.2)
		} else {
  		btn.scale = vec2(1)
  		btn.color = rgb(171, 171, 171)
  	}
	})
}

window.imageButton = function(spriteId, p, f){
  const boundBox = add([
  	rect(50, 50),
  	pos(p),
  	color(255, 255, 255),
  	opacity(0.5),
  	area({
  		cursor: "pointer",
  	}),
  	outline(1, new Color(255, 255, 255)),
  	origin("center")
  ])
  
  const img = add([
  	sprite(spriteId),
  	pos(p),
  	scale(0.065),
  	area({
  		cursor: "pointer",
  	}),
  	outline(1),
  	origin("center")
  ])
  
  boundBox.onUpdate(function(){
  	if(boundBox.isHovering() || img.isHovering()){
      if(mobile){
        f()
      }
  		boundBox.scale = vec2(1.3)
  		img.scale = vec2(0.08)
  	}else{
  		boundBox.scale = vec2(1)
  		img.scale = vec2(0.065)
  	}
  })

  boundBox.onClick(f)
  img.onClick(f)
}

window.fireCaption = function(msg, time){
  const txt = add([
    text(msg, {size: 25}),
    origin("center"),
    pos(width() / 2, height() - 30),
    outline(2),
    fixed()
  ])
  
  wait(time, () => {
    txt.destroy()
  })
}

window.achAnim = function(id, callback) {
  achievements.test = {name:"Test",desc:"Test"}
	var main = add([
		rect(320, 60, {radius: 5}),
		origin("top"),
		pos(9999, 10),
		outline(4, new Color(234, 207, 196)),
		color(45, 21, 19)
	])

	var achtxt = add([
		text(achievements[id].name, {size: 16}),
		pos(9999, 30),
		origin("center"),
		color(255, 255, 255),
	]);

	var achdesc = add([
		text(achievements[id].desc, {size: 12}),
		pos(9999, 50),
		origin("center"),
		color(255, 255, 255),
	]);
  delete achievements.test;

	main.pos.x = width() + 160
	achtxt.pos.x = width() + 160
	achdesc.pos.x = width() + 160
	var counter = 160
	var evt;
	var sound = play("achievement", {
		volume: 7
	})
	main.onUpdate(function() {
    var currCam = camPos();
		if (counter > -160) {
      counter -= 7
    }
    main.pos.x = (currCam.x + 320.5) + counter
		achtxt.pos.x = (currCam.x + 320.5) + counter
		achdesc.pos.x = (currCam.x + 320.5) + counter
    main.pos.y = currCam.y - 261
    achtxt.pos.y = (currCam.y - 261) + 20
    achdesc.pos.y = (currCam.y - 261) + 40
	})
	wait(sound.duration(), function() {
		main.destroy()
		achtxt.destroy()
		achdesc.destroy()
		callback()
	})
}

window.addMobileControls = function(){
  window.up = add([
    sprite("up"),
    pos(102, height() - 140),
    area(),
    scale(2),
    origin("center"),
  ])
  window.down = add([
    sprite("down"),
    pos(100, height() - 30),
    area(),
    scale(2),
    origin("center"),
  ])
  window.left = add([
    sprite("left"),
    pos(45, height() - 85),
    area(),
    scale(2),
    origin("center"),
  ])
  window.right = add([
    sprite("right"),
    pos(157, height() - 85),
    area(),
    scale(2),
    origin("center"),
  ])
}

window.hasAchievement = (id) => {
  var gamedata = [];
  
  if(localStorage.gamedata){
    gamedata = JSON.parse(localStorage.gamedata)
  }else{
    localStorage.gamedata = "[]"
  }

  return (gamedata.indexOf(id) > -1)
}

window.grantAchievement = (id, callback, forceAnim=false) => {
  if(window.experiments.hasOwnProperty('accounts') && window.experiments.accounts){
    auth.getUserInfo().then(res => {
      if(res.hasOwnProperty('reauth') && res.reauth){
        callback()
      }else{
        callback = callback || function(){}
      
        if(!window.hasAchievement(id)){
          var gamedata = [];
          
          if(localStorage.gamedata){
            gamedata = JSON.parse(localStorage.gamedata)
          }else{
            localStorage.gamedata = "[]"
          }
          
          gamedata.push(id)
          localStorage.gamedata = JSON.stringify(gamedata)
          auth.addAch(res.id, id)
          window.achAnim(id, callback)
        }else if(forceAnim == true){
          window.achAnim(id, callback)
        }else{
          callback()
        }
      }
    })
  }else{
    callback()
  }
}

window.setBg = function(bg){
  var gl = canvas.getContext('webgl')
  var cl = Color.fromArray(bg);
  gl.clearColor(cl.r / 255, cl.g / 255, cl.b / 255, 1);
}

window.inventory = []
window.beastBuffs = {
  speed: 0
}

// experiments
if(localStorage.hasOwnProperty("experiments")){
  try{
    window.experiments = JSON.parse(localStorage.experiments)
  }catch(e){
    window.experiments = {}
  }
  window.experiments.accounts = true
}else{
  window.experiments = {
    accounts: true
  }
}

// Accounts
if(window.experiments.hasOwnProperty("accounts") && window.experiments.accounts){
  window.addEventListener("message", function(event) {
    if(event.data == 'signed_in'){
      location.reload()
    }
  });

  auth.getUserInfo().then((info) => {
    if(info.hasOwnProperty("reauth") && info.reauth){
      go("title")
    }else{
      auth.createUser(info.id).then(() => {
        auth.getUserData(info.id).then((data) => {
          if(data.disabled){
            go("disabled", data.message)
          }else{
            // Sync achievements
            localStorage.gamedata = JSON.stringify(data.achievements || [])
  
            // FLAG: DEFAULT_EXPERIMENTS
            // Sync experiments
            var experiments = {
              accounts: true
            }
            data.experiments = data.experiments || []
            data.experiments.forEach((key) => {
              experiments[key] = true
            })
            localStorage.experiments = JSON.stringify(experiments)
            window.experiments = experiments
            go("title")
          }
        })
      })
    }
  })
}

// API v2
import "./api-v2"

window.anticheat.checkMain()

// Mod store
function generateRandomString() {
	let randomString = '';
	const randomNumber = Math.floor(Math.random() * 10);
	for (let i = 0; i < 20 + randomNumber; i++) {
		randomString += String.fromCharCode(33 + Math.floor(Math.random() * 94));
	}
	return randomString;
}

if(localStorage.hasOwnProperty('mods')){
  Object.values(JSON.parse(localStorage.mods)).forEach(async (code) => {
    try{
      var res = await (await fetch(code)).text()
      eval(res)
    }catch(e){
      console.error(e)
    }
  })
}

scene("game", (difficulty="easy", oldDifficulty="easy") => { // oldDifficulty is for beast mode
  // define constants + variables
  const SPEED = (200 + beastBuffs.speed);
  var frozen = false;
  var canKill = false;
  var isImmortal = false;
  window.currentDifficulty = difficulty
  
  gravity(2400)
  
  // define level
  var levels = {
    "beast": [ // the beast box (should only be loaded in beast mode)
      "==============================================================",
      "=                                                            =",
      "=@                                                        b  =",
      "=                                                          | =",
      "=____________________________________________________________="
    ],
    "easy": [
      "x@  d             d d   d d                         d d    x",
    	"x     _    __    _____ _____                         _     x",
    	"x    _=_        _===== =====_                       _=   | x",
      "x____===_ ____ _====== ======_ _ _ _ _ _ __  _  _  _==_____x"
    ],
    "normal": [
      "x@ ddd ddddd     -   t            -                       d    x",
    	"x     _        __    _____ _____                         _     x",
    	"x    _=_            _===== =====_                      t_=   | x",
      "x____===_____ ____ _====== ======_ _ _ _ _ _ __  _  _  _==_____x"
    ]
  }
  if(window.api.apiVersion == 'v2'){
    if(window.__apiInternals.useCustom){
      levels.custom = window.__apiInternals.registeredLevels[window.__apiInternals.customIndex].data
    }
  }else{
    levels.custom = window.__apiInternals.customLevel
  }
  const level = addLevel(levels[difficulty], {
  	width: 64,
  	height: 64,
  	// The position of the top left block
  	pos: vec2(100, 200),
  	"@": () => [
  		sprite("player"),
  		area(),
  		body(),
  		origin("bot"),
  		"player",
  	],
  	"_": () => [
  		sprite("ground"),
  		area(),
  		solid(),
  		origin("bot"),
  	],
    "=": () => [
      sprite("dirt"),
      area(),
      solid(),
      origin("bot")
    ],
    "|": () => [
      sprite("goal"),
      area(),
      origin("bot"),
      "goal"
    ],
    "x": () => [
      sprite("barrier"),
      area(),
      solid(),
      origin("bot")
    ],
    "-": () => [
      sprite("halfBarrier"),
      area(),
      solid(),
      origin("bot")
    ],
    // enemies
    "d": () => [
      sprite("dirtguy"),
      area(),
      solid(),
      body(),
      patrol(100),
      enemyKillable(),
      origin("bot"),
      "dirtGuy"
    ],
    "t": () => [
      sprite("trollface"),
      area(),
      solid(),
      //body(),
      patrol(0.5, 550, 1),
      enemyKillable(),
      origin("bot"),
      "trollface"
    ],
    "b": () => [
      sprite("mrbeast"),
      area(),
      solid(),
      body(),
      patrol(3840, 650, -1),
      enemyKillable(),
      origin("bot"),
      "mrbeast"
    ]
  })

  window.getLevelPos = level.getPos
  
  const player = get("player")[0]

  function respawn(method){
    if(!isImmortal){
      isImmortal = true
      if(difficulty != "beast"){
        frozen = true;
        go("died", method, difficulty)
      }else{
        frozen = true
        window.beastBuffs.speed -= 50
        window.fireCaption("MrBeast punished you with -50 speed.")
        wait(1, () => {
          go("died", method, oldDifficulty)
        })
      }
    }else{
      if(method == "the void" || method == "the parkour"){
        player.pos.y = (level.getPos(0, 0)).y
      }
    }
  }
  
  // keybinds

  onKeyPress("escape", () => {
    go("title")
  })
  
  onKeyPress("up", () => {
  	if (!frozen && player.isGrounded()) {
      canKill = true
  		player.jump()
  	}
  })
  
  onKeyDown("left", () => {
    if(!frozen){
  	 player.move(-SPEED, 0)
    }
  })
  
  onKeyDown("right", () => {
  	if(!frozen){
      player.move(SPEED, 0)
    }
  })
  
  onKeyDown("down", () => {
    if(!frozen){
      player.use(sprite("playerCrouch"))
    }
  })
  
  onKeyRelease("down", () => {
    if(!frozen){
      player.use(sprite("player"))
    }
  })
  
  onKeyPress("w", () => {
  	if (!frozen && player.isGrounded()) {
      canKill = true
  		player.jump()
  	}
  })
  
  onKeyDown("a", () => {
  	if(!frozen){
      player.move(-SPEED, 0)
    }
  })
  
  onKeyDown("d", () => {
  	if(!frozen){
      player.move(SPEED, 0)
    }
  })
  
  onKeyDown("s", () => {
    if(!frozen){
      player.use(sprite("playerCrouch"))
    }
  })
  
  onKeyRelease("s", () => {
    if(!frozen){
      player.use(sprite("player"))
    }
  })

  function gcButtonHold(e){
    switch(e.detail.name){
      case "HOME":
        go("title")
        break
      case "FACE_1":
        if (!frozen && player.isGrounded()) {
          canKill = true
      		player.jump()
      	}
        break
      case "FACE_2":
        if (!frozen && player.isGrounded()) {
          canKill = true
      		player.jump()
      	}
        break
      case "DPAD_LEFT":
        if(!frozen){
          player.move(-SPEED, 0)
        }
        break
      case "DPAD_RIGHT":
        if(!frozen){
          player.move(SPEED, 0)
        }
        break
      case "FACE_3":
        if(!frozen){
          player.use(sprite("playerCrouch"))
        }
        break
      case "FACE_4":
        if(!frozen){
          player.use(sprite("playerCrouch"))
        }
        break
    }
  }
  events.push(["gc.button.hold", gcButtonHold])
  window.addEventListener('gc.button.hold', gcButtonHold, false)

  function gcButtonRelease(e){
    if(["FACE_3", "FACE_4"].indexOf(e.detail.name) > -1){
      if(!frozen){
        player.use(sprite("player"))
      }
    }
  }
  events.push(["gc.button.release", gcButtonRelease])
  window.addEventListener("gc.button.release", gcButtonRelease)

  if(debugMode){
    onKeyPress("=", () => {
      isImmortal = !isImmortal
    })

    onKeyPress("-", () => {
      achAnim("test", function(){})
    })
  }
  
  // collisions
  var originalCam = camPos();
  //var goal = get("goal")[0];

  player.onCollide("dirtGuy", (enemy, collision) => {
    if (enemy.isAlive == false) return;
    if (canKill && collision.isBottom()) {
      enemy.kill()
      player.pos.y -= 5
      canKill = true

      // 1% chance for banish item to drop
      if(Math.random() < 0.01){
        window.inventory.push("banisher")
        fireCaption(window.items["banisher"].caption, 5)
      }
      
      // grant achievement
      window.grantAchievement("dirtguyKill", function(){})
    } else {
      if(window.inventory.indexOf("banisher") == -1){
        respawn("the Minecraft dirt block guy")
      }else{
        window.inventory.splice(window.inventory.indexOf("banisher"), 1)
        play("banish")
        enemy.kill(5, 5, false)
        window.grantAchievement("dirtguyBanish", function(){})
      }
    }
  })

  player.onCollide("trollface", (enemy) => {
    if (enemy.isAlive == false) return;
    if(window.inventory.indexOf("banisher") == -1){
      respawn("trollface")
    }else{
      window.inventory.splice(window.inventory.indexOf("banisher"), 1)
      play("banish")
      enemy.kill(5, 5, false)
      window.grantAchievement("trollfaceBanish", function(){})
    }
  })

  player.onCollide("mrbeast", (enemy) => {
    if (enemy.isAlive == false) return;
    respawn("MrBeast") // mrbeast cannot be banished
  })
  
  player.onCollide("goal", (goal) => {
    if(difficulty != "beast"){
      window.beastBuffs.speed = 0
      destroy(goal);
      frozen = true;
      go("finish", difficulty)
    }else{
      window.beastBuffs.speed += 50
      window.inventory.push("banisher")
      player.pos.x = goal.pos.x
      destroy(goal)
      get("mrbeast")[0].destroy()
      frozen = true
      window.grantAchievement("mrbeastSurvive", function(){
        window.fireCaption("MrBeast gave you +50 speed and a banisher!")
        wait(1, function(){
          go("game", oldDifficulty)
        })
      })
    }
  })

  var lastCheck = new Date()
  player.onUpdate(() => {
    var currCam = camPos();
    
    // respawn from void
    if(player.pos.y > level.getPos(0,0).y + 512 && !frozen){
      respawn("the void")
    }
    
    // center camera to player for scrolling
    if (currCam.x < player.pos.x) {
      camPos(player.pos.x, currCam.y);
    }

    // prevent permenant immortality
    if (player.isGrounded()){
      canKill = false
    }

    // beast mode
    var chance = 0.01
    if(difficulty == "normal"){
      chance = 0.02
    }
    if((new Date() - lastCheck > 1000)){
      if(["beast", "custom"].indexOf(difficulty) == -1 && Math.random() < chance){
        go("game", "beast", difficulty)
      }
      lastCheck = new Date()
    }
  })
  
  if(difficulty != "beast"){
    //play("load")
    play("game", {
      loop: true
    })
  }else{
    window.grantAchievement("mrbeastMeet", function(){})
    camPos(camPos().x, 311)
    play("mrbeast", {
      loop: true,
      volume: 3
    })
  }
  
});

scene("died", (method="Unknown", difficulty="easy") => {
  var txt = `You died to ${method}`
  var size = 26
  
  if(method == "Unknown"){
    txt = "Hmm. That is odd. I cannot seem to figure out who you died to."
    size = 16

    window.grantAchievement("unknownDeath", function(){}, true)
  }
  add([
    text(txt, { size: size }),
    pos(vec2(320.5, 261)),
    origin("center"),
    color(255, 255, 255),
  ]);

  var sound;
  if(method == "the Minecraft dirt block guy"){
    sound = play("dirtdeath")
    window.grantAchievement("dirtguyDeath", function(){})
  }else if(method == "trollface"){
    sound = play("trollfaceDie")
    window.grantAchievement("trollfaceDeath", function(){})
  }else if(method == "MrBeast"){
    sound = play("mrbeastdeath")
    window.grantAchievement("mrbeastDeath", function(){})
  }else{
    sound = play("death")
  }

  if(method == "the void"){
    window.grantAchievement("voidDeath", function(){})
  }

  onKeyPress("space", () => {
    sound.stop()
    go("game", difficulty)
  })

  function gcButtonPress(e){
    sound.stop()
    go("game", difficulty)
  }
  events.push(["gc.button.press", gcButtonPress])
  window.addEventListener("gc.button.press", gcButtonPress)
  
  wait(sound.duration(), () => {
    go("game", difficulty)
  })
});

scene("finish", (difficulty) => {
  add([
    text("You Win!", { size: 64 }),
    pos(vec2(320.5, 261)),
    origin("center"),
    color(255, 255, 255),
  ]);

  var win = play("win")

  wait(win.duration(), function(){
    if(difficulty == "easy"){
      window.grantAchievement("winEasy", function(){
        go("title")
      })
    }else if(difficulty == "normal"){
      window.grantAchievement("winNormal", function(){
        go("title")
      })
    }else{
      go("title")
    }
  })
});

scene("title", async () => {
  add([
    text("Some Random Platformer", { size: 37 }),
    pos(vec2(320.5, 61)),
    origin("center"),
    color(255, 255, 255),
  ]);

  add([
    text(window.game_version.name, { size: 30 }),
    pos(vec2(320.5, 105)),
    origin("center"),
    color(255, 255, 255),
  ])

  var info = await auth.getUserInfo()
  
  addButton("Start", vec2(320.5, 191), function(){
    go("difficulty")
  })

  if(window.experiments.hasOwnProperty("accounts")){
    if(info.hasOwnProperty("reauth") && info.reauth){
      addButton("Sign In", vec2(320.5, 226), function(){
        window.open("/auth", "", "width=700, height=800, resizable=no")
      })
    }else{
      addButton("Account", vec2(320.5, 226), function(){
        go("account")
      })
    }
  }

  addButton("Controls", vec2(320.5, 261), function(){
    go("controls")
  })

  addButton("Mod Directory", vec2(320.5, 296), function(){
    window.open("/modstore", "", "resizeable=no")
  }, (window.experiments.hasOwnProperty('modstore') && window.experiments.modstore), "(Coming soon)")
  
  addButton("Settings", vec2(320.5, 331), function(){
    go("settings")
  })

  add([
    text("Game created by Powerbox1000 Studios", { size: 20 }),
    pos(vec2(width() / 2, 487)),
    origin("center"),
    color(255, 255, 255),
  ]);

  // imageButton("discord", vec2((width() / 2) - 100, 437), function(){
  //   var a = document.createElement('a')
  //   a.href = "https://discord.gg/6fsHzXuXXT"
  //   a.target = "_blank"
  //   a.click()
  // })

  // imageButton("guilded", vec2((width() / 2), 437), function(){
  //   var a = document.createElement('a')
  //   a.href = "https://guilded.gg/Powerbox1000-Studios"
  //   a.target = "_blank"
  //   a.click()
  // })

  // imageButton("revolt", vec2((width() / 2) + 100, 437), function(){
  //   var a = document.createElement('a')
  //   a.href = "https://rvlt.gg/RM1Q5xzB"
  //   a.target = "_blank"
  //   a.click()
  // })

  // all this because ONE thing in the vanilla function isn't there :(
  
  loadRoot('')
  loadSprite('kaSprite', 'https://raw.githubusercontent.com/replit/kaboom/v2000.2/assets/sprites/ka.png')
  loadSprite('boomSprite', 'https://raw.githubusercontent.com/replit/kaboom/v2000.2/assets/sprites/boom.png')
  
  function explode(speed=2, size=1){
  	let time = 0;
  	return {
  		id: "explode",
  		require: [ "scale", ],
  		update() {
  			const s = Math.sin(time * speed) * size;
  			if (s < 0) {
  				destroy(this);
  			}
  			this.scale = vec2(s);
  			time += dt();
  		},
  	};
  }
  
  function addKaboomNew(p, opt={}){
  
  	const speed = (opt.speed || 1) * 5;
  	const s = opt.scale || 1;
  
  	const boom = add([
  		pos(p),
  		sprite('boomSprite'),
  		scale(0),
  		stay(),
  		origin("center"),
          area(),
  		explode(speed, s),
  		...(opt.boomComps ?? (() => []))(),
  	]);
  
  	const ka = add([
  		pos(p),
  		sprite('kaSprite'),
  		scale(0),
  		stay(),
  		origin("center"),
          area(),
  		timer(0.4 / speed, () => ka.use(explode(speed, s))),
  		...(opt.kaComps ?? (() => []))(),
  	]);
  
  	return {
  		destroy() {
  			destroy(ka);
  			destroy(boom);
  		},
          onClick(f) {
              ka.onClick(f)
              boom.onClick(f)
          }
  	};
  }

  onKeyPress('k', function(){
    var ks = addKaboomNew(rand(0, width()), rand(0, height()))
    ks.onClick(function(){
      var t = 0
      function rainbow(){
        setBg([
          wave(0, 255, t),
    			wave(0, 255, t + 2),
    			wave(0, 255, t + 4)
        ])
        t++
        setTimeout(rainbow, 200)
      }
      rainbow()
    })
  })

  // FLAG: GPP_TEMP
  var utime = Math.floor(new Date().getTime() / 1000)
  var start = 1684854000
  var end = 1684857600
  if(utime > start && utime < end){
    console.log("GPP time")
    window.grantAchievement("gpp", function(){})
  }else{
    console.log("Not GPP (either not yet or already passed)")
  }

  if(debugMode){
    addEventListener("keypress", function(e){
        if(e.key == "b"){
            go("game", "beast")
        }
    })
  }
})

scene("difficulty", () => {
  if(window.api.apiVersion == 'v2'){
    if(window.__apiInternals.useCustom && window.__apiInternals.registeredLevels.length > 0){
      if(window.__apiInternals.registeredLevels.length == 1){
        window.__apiInternals.customId = window.__apiInternals.registeredLevels[0].id
        window.__apiInternals.customIndex = 0
        go("game", "custom")
      }else{
        var win = window.open("about:blank", "_blank", "resizable:no")
        var ul = win.document.createElement('ul')
        ul.style = 'list-style:none;text-align:center;color:white;font-family:Arial;font-size:24px;overflow-x:hidden;'
        ul.style.textShadow = '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000'
        var i = 0;
        window.__apiInternals.registeredLevels.forEach((lvl) => {
          var li = win.document.createElement('li')
          li.style = 'margin-bottom:10px'
          var a = win.document.createElement('a')
          a.dataset.id = lvl.id
          a.dataset.index = i
          a.style = 'color:blue;'
          a.href = '#'
          a.innerHTML = lvl.name
          a.onclick = function(){
            window.__apiInternals.customId = a.dataset.id
            window.__apiInternals.customIndex = parseInt(a.dataset.index)
            win.close()
            window.go("game", "custom")
          }
          li.appendChild(a)
          ul.appendChild(li)
          i++
        })
        win.document.body.innerHTML = '<h1 style="text-align:center;font-family:Arial;color:white;text-shadow:-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;">Select Custom Level</h1>'
        win.document.body.appendChild(ul)
        win.document.body.style.background = 'rgb(18, 215, 255)'
      }
    }
  }else{
    if(window.__apiInternals.customEnabled){
      go("game", "custom")
    }
  }
  
  add([
    text("Select Difficulty", { size: 37 }),
    pos(vec2(320.5, 61)),
    origin("center"),
    color(255, 255, 255),
  ]);

  addButton("Easy", vec2(320.5, 226), function(){
    go("game", "easy")
  })

  addButton("Normal", vec2(320.5, 261), function(){
    go("game", "normal")
  }, (!window.hasAchievement("winEasy")), "(Locked)")

  addButton("Hard", vec2(320.5, 296), function(){
    //todo: hard mode
  }, true, "(Not added)")
})

scene("account", () => {
  add([
    text("Account", { size: 37 }),
    pos(vec2(320.5, 61)),
    origin("center"),
    color(255, 255, 255),
  ]);

  addButton("Account Info", vec2(320.5, 226), function(){
    alert("Not implememted yet")
  }, true)
  
  addButton("Achievements", vec2(320.5, height() / 2), function(){
    window.open("/achievements", "", "resizeable=no")
  })

  addButton("Sign out", vec2(320.5, 296), function(){
    delete localStorage.code
    location.reload()
  })

  addButton("Back", vec2(320.5, 487), function(){
    go("title")
  })
})

scene("controls", () => {
  add([
    text("Controls", { size: 37 }),
    pos(vec2(320.5, 61)),
    origin("center"),
    color(255, 255, 255),
  ]);

  add([
    text(`W or Up arrow - Jump
    S or down arrow - Crouch
    A or left arrow - Move Left
    D or right arrow - Move Right
    Escape (during game only) - Return to title screen
    Space (on death screen only) - Skip death screen`, { size: 20 }),
    pos(vec2(300.5, 261)),
    origin("center"),
    color(255, 255, 255),
  ]);

  addButton("Back", vec2(320.5, 487), function(){
    go("title")
  })
})

scene("settings", () => {
  add([
    text("Settings", { size: 37 }),
    pos(vec2(320.5, 61)),
    origin("center"),
    color(255, 255, 255),
  ]);

  addButton("Reset Save", vec2(320.5, 226), function(){
    go("reset")
  })
  
  // FLAG: BETA_TOGGLE
  addButton((localStorage.channel == "beta" ? "Disable Beta Channel" : "Enable Beta Channel"), vec2(320.5, 261), function(){
    if(localStorage.channel == "beta"){
      localStorage.channel = ""
      location.reload()
    }else{
      go("beta")
    }
  }, true)

  addButton("Credits", vec2(320.5, 296), function(){
    go("credits")
  })

  addButton("Back", vec2(320.5, 487), function(){
    go("title")
  })
})

scene("reset", () => {
  add([
    text("Are you sure you want to reset your save?", { size: 23 }),
    pos(vec2(320.5, 241)),
    origin("center"),
    color(255, 255, 255),
  ]);

  addButton("Yes", vec2(260.5, 281), function(){
    localStorage.gamedata = "[]"
    go("blank")
    auth.getUserInfo().then((res) => {
      if(res.hasOwnProperty("reauth") && res.reauth){
        location.reload()
      }else{
        auth.clearAch(res.id).then(() => {
          location.reload()
        })
      }
    })
  })
  
  addButton("No", vec2(400.5, 281), function(){
    go("settings")
  })
})

scene("beta", () => {
  add([
    text("Are you sure you want to enable the beta channel?\nThe beta channel may have bugs and glitches\nthat ruin the game!", { size: 20 }),
    pos(vec2(320.5, 241)),
    origin("center"),
    color(255, 255, 255),
  ]);

  addButton("Yes", vec2(260.5, 290), function(){
    localStorage.channel = "beta"
    location.reload()
  })
  
  addButton("No", vec2(400.5, 290), function(){
    go("settings")
  })
})

scene("credits", () => {
  add([
    text("Credits", { size: 37 }),
    pos(vec2(320.5, 61)),
    origin("center"),
    color(255, 255, 255),
  ]);

  var txt = add([
    text(`@Powerbox1000#9058 - Lead developer/graphic designer
    @Gamerboi276#6147 - Bug Hunter
    @That One Backrooms Entity#2126 - Cried to be here
    @procat#8673 - Entity death sound
    Mariana - For the idea of MrBeast's box
    LSPLASH - for making royalty free sounds from DOORS
    @partyrockerz211#0493 - W Game Trailer`, { size: 18 }),
    pos(center()),
    area(),
    origin("center"),
    color(255, 255, 255),
  ]);

  // Action keys
  txt.onClick(() => {
    var key = prompt("Enter action key")
    switch(key){
      case null:
        break;
      case "dev-dangerous-only-enable-if-you-know-what-youre-doing":
        localStorage.channel = key
        location.reload()
        break;
      case "reset-channel":
        localStorage.channel = ""
        location.reload()
        break;
      case "kaboom-madness":
          function km(){
            addKaboom(mousePos())
            setTimeout(km, 20)
          }
          km()
        go("title")
        break;
      case "hard-mode-beta":
        eval(atob("bG9jYXRpb24uaHJlZiA9ICJodHRwczovL3d3dy55b3V0dWJlLmNvbS93YXRjaD92PWRRdzR3OVdnWGNRIg=="))
        break;
      default:
        alert("Invalid action key")
    }
  })

  addButton("Back", vec2(320.5, 487), function(){
    go("settings")
  })
})

scene("disabled", (msg) => {
  add([
    text("Account Disabled", { size: 37 }),
    pos(vec2(320.5, 61)),
    origin("center"),
    color(255, 255, 255),
  ]);

  add([
    text(`Your account was disabled for ${msg}.\nIf you would like to appeal, DM @Powerbox1000#9058`, { size: 16 }),
    pos(center()),
    origin("center"),
    color(255, 255, 255),
  ]);
})

scene("message", (msg, size=18, showBackBtn=true, backBtnEvt=function(){}) => {
  add([
    text(msg, { size: size }),
    pos(center()),
    origin("center"),
    color(255, 255, 255),
  ]);

  if(showBackBtn){
    addButton("Back", vec2(320.5, 487), function(){
      go("title")
      backBtnEvt()
    })
  }
})

scene("blank", () => {})
