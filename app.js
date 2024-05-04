/*
    Javascript Space Game
    By Frank Force 2021
    Updated By Alpha
*/

'use strict';       // -->which enforces stricter parsing and error handling in JavaScript.

const clampCamera = !debug;
const lowGraphicsSettings = glOverlay = !window['chrome']; // only chromium uses high settings
const startCameraScale = 4 * 16;
const defaultCameraScale = 4 * 16;
const maxPlayers = 4;
const sound_rageMode = [.6, 0.2, 500, 0.05, , 0.3, 1, 2, , , 570, 0.02, 0.02, , , , 0.04];//Alpha
const sound_rageModeUsed = [0.3, 0.1, 10000, 0.1, , 0.3, 1, 2, , , 570, 0.02, 0.02, , , , 0.04];//Alpha

const team_none = 0;
const team_player = 1;
const team_enemy = 2;

let updateWindowSize, renderWindowSize, gameplayWindowSize;

engineInit(

    ///////////////////////////////////////////////////////////////////////////////
    () => // appInit 
    {

        resetGame();
        cameraScale = startCameraScale;
    },

    ///////////////////////////////////////////////////////////////////////////////
    () => // appUpdate
    {
        const cameraSize = vec2(mainCanvas.width, mainCanvas.height).scale(1 / cameraScale);
        renderWindowSize = cameraSize.add(vec2(5));
        gameplayWindowSize = vec2(mainCanvas.width, mainCanvas.height).scale(1 / defaultCameraScale);
        updateWindowSize = gameplayWindowSize.add(vec2(30));
        //debugRect(cameraPos, maxGameplayCameraSize);
        //debugRect(cameraPos, updateWindowSize);

        if (debug) {
            randSeeded(randSeeded(randSeeded(randSeed = Date.now()))); // set random seed for debug mode stuf
            if (keyWasPressed(81))
                new Enemy(mousePosWorld);//enemy spawn

            if (keyWasPressed(84)) {
                new Prop(mousePosWorld);//prop or box spawn
            }

            if (keyWasPressed(69))
                explosion(mousePosWorld);

            // if (keyIsDown(89)) {
            //     let e = new ParticleEmitter(mousePosWorld);

            //     // test
            //     e.collideTiles = 1;
            //     //e.tileIndex=7;
            //     e.emitSize = 2;
            //     e.colorStartA = new Color(1, 1, 1, 1);
            //     e.colorStartB = new Color(0, 1, 1, 1);
            //     e.colorEndA = new Color(0, 0, 1, 0);
            //     e.colorEndB = new Color(0, .5, 1, 0);
            //     e.emitConeAngle = .1;
            //     e.particleTime = 1
            //     e.speed = .3
            //     e.elasticity = .1
            //     e.gravityScale = 1;
            //     //e.additive = 1;
            //     e.angle = -PI;
            // }

            // if (mouseWheel) // mouse zoom
            //     cameraScale = clamp(cameraScale * (1 - mouseWheel / 10), defaultTileSize.x * 10, defaultTileSize.x / 16);
            //Alpha-->Changed Maximum Zoom level and minimum zoom level useer could have zoomed a lot and thats why i set a minimum zoom level
            if (mouseWheel) { // mouse zoom
                const zoomFactor = 1 - mouseWheel / 10;  // Calculate zoom factor

                // Adjust camera scale based on zoom factor
                cameraScale *= zoomFactor;

                // Clamp camera scale to prevent excessive zooming out
                cameraScale = Math.max(cameraScale, defaultTileSize.x / 0.5); // Minimum zoom level (1/50th of default)
                cameraScale = Math.min(cameraScale, defaultTileSize.x * 8); // Maximum zoom level
            }
            //Alpha-->A glitch was their whenever we hit M on keyboard cleared the glitch
            // if (keyWasPressed(77))
            //     playSong([[[, 0, 219, , , , , 1.1, , -.1, -50, -.05, -.01, 1], [2, 0, 84, , , .1, , .7, , , , .5, , 6.7, 1, .05]], [[[0, -1, 1, 0, 5, 0], [1, 1, 8, 8, 0, 3]]], [0, 0, 0, 0], 90]) // music test

            if (keyWasPressed(77))
                players[0].pos = mousePosWorld;

            if (keyWasPressed(82)) { // 'R' key was pressed for rage mode
                if (!rageused) {
                    playSound(sound_rageMode, cameraPos);
                    ragemode = 1;
                    godMode = 1;
                    let count = 0;
                    setInterval(() => {
                        if (ragemode) {
                            playSound(sound_rageModeUsed, cameraPos);
                            count++;
                        }
                    }, 100);
                    setTimeout((player) => {

                        ragemode = 0;
                        rageused = 1;
                        godMode = 0;
                    }, 10000);
                }
                else {
                    playSound(sound_rageModeUsed, cameraPos);
                }

            }
            if (keyWasPressed(78)) //N
                nextLevel();
        }

        // restart if no lives left
        let minDeadTime = 1e2;
        for (const player of players)
            minDeadTime = min(minDeadTime, player && player.isDead() ? player.deadTimer.get() : 0);

        if (minDeadTime > 3 && (keyWasPressed(90) || keyWasPressed(32) || gamepadWasPressed(0)))//removed reset on pressing "R Key" as when i was playing i mistakenly pressed R and everything was reset
            resetGame();

        if (levelEndTimer.get() > 3)
            nextLevel();
    },

    ///////////////////////////////////////////////////////////////////////////////
    () => // appUpdatePost
    {
        if (players.length == 1) {
            const player = players[0];
            if (!player.isDead())
                cameraPos = cameraPos.lerp(player.pos, clamp(player.getAliveTime() / 2));
        }
        else {
            // camera follows average pos of living players
            let posTotal = vec2();
            let playerCount = 0;
            let cameraOffset = 1;
            for (const player of players) {
                if (player && !player.isDead()) {
                    ++playerCount;
                    posTotal = posTotal.add(player.pos.add(vec2(0, cameraOffset)));
                }
            }

            if (playerCount)
                cameraPos = cameraPos.lerp(posTotal.scale(1 / playerCount), .2);
        }

        // spawn players if they don't exist
        for (let i = maxPlayers; i--;) {
            if (!players[i] && (gamepadWasPressed(0, i) || gamepadWasPressed(1, i))) {
                ++playerLives;
                new Player(checkpointPos, i);
            }
        }

        // clamp to bottom and sides of level
        if (clampCamera) {
            const w = mainCanvas.width / 2 / cameraScale + 1;
            const h = mainCanvas.height / 2 / cameraScale + 2;
            cameraPos.y = max(cameraPos.y, h);
            if (w * 2 < tileCollisionSize.x)
                cameraPos.x = clamp(cameraPos.x, tileCollisionSize.x - w, w);
        }

        updateParallaxLayers();

        updateSky();
    },

    ///////////////////////////////////////////////////////////////////////////////
    () => // appRender
    {
        const gradient = mainContext.createLinearGradient(0, 0, 0, mainCanvas.height);
        gradient.addColorStop(0, levelSkyColor.rgba());
        gradient.addColorStop(1, levelSkyHorizonColor.rgba());
        mainContext.fillStyle = gradient;
        //mainContext.fillStyle = levelSkyColor.rgba();
        mainContext.fillRect(0, 0, mainCanvas.width, mainCanvas.height);

        drawStars();

    },

    ///////////////////////////////////////////////////////////////////////////////
    () => // appRenderPost
    {
        mainContext.textAlign = 'center';
        const p = percent(gameTimer.get(), 8, 10);
        //mainContext.globalCompositeOperation = 'difference';
        // mainContext.fillStyle = new Color(0, 0, 0, p).rgba();--> //Made the Space Huggers Text Transparent IDK but looked more cool to me i guess
        if (p > 0) {
            //mainContext.fillStyle = (new Color).setHSLA(time/3,1,.5,p).rgba();
            mainContext.font = '1.5in impact';
            mainContext.fillText('SPACE HUGGERS', mainCanvas.width / 2, 140);
        }

        mainContext.font = '.5in impact';
        if (p > 0) {
            // Render the first line of text
            mainContext.fillText('A Game by', mainCanvas.width / 2, 200);

            // Render the second line of text
            mainContext.fillText('$$ Alpha $$', mainCanvas.width / 2, 260);
            // mainContext.font = '42px Arial';
        }


        // check if any enemies left
        let enemiesCount = 0;
        for (const o of engineCollideObjects) {
            if (o.isCharacter && o.team == team_enemy) {
                ++enemiesCount;
                const pos = vec2(mainCanvas.width / 2 + (o.pos.x - cameraPos.x) * 30, mainCanvas.height - 20);
                // drawRectScreenSpace(pos, o.size.scale(20), o.color.scale(1, .6)); //I dont this the rectangle at down is required it is more fun to find and kill
            }
        }

        if (!enemiesCount && !levelEndTimer.isSet())
            levelEndTimer.set();

        mainContext.fillStyle = new Color(0, 0, 0).rgba();
        mainContext.fillText('Level ' + level + '      Lives ' + playerLives + '      Enemies ' + enemiesCount, mainCanvas.width / 2, mainCanvas.height - 40);

        // fade in level transition
        const fade = levelEndTimer.isSet() ? percent(levelEndTimer.get(), 3, 1) : percent(levelTimer.get(), .5, 2);
        drawRect(cameraPos, vec2(1e3), new Color(0, 0, 0, fade))
    });