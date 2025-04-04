// main.js - ゲームのメイン処理

// ゲームの状態管理
const gameState = {
    health: 100,
    maxHealth: 100,
    ammo: 30,
    maxAmmo: 30,
    currentRoom: null,
    isTransitioning: false,
    isLoading: true,
    zombiesKilled: 0
};

// キー入力の状態
const keyState = {
    w: false,
    a: false,
    s: false,
    d: false,
    shift: false,
    e: false,
    r: false
};

// レンダラーの設定
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// シーンの作成
const scenes = {};

// カメラの設定
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 5);

// 部屋の作成
function createRoom(roomId, width, length, doorPositions) {
    try {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x111111);
        
        // 部屋の床
        const floorGeometry = new THREE.PlaneGeometry(width, length);
        const floorMaterial = new THREE.MeshPhongMaterial({ color: 0x555555, side: THREE.DoubleSide });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);
        
        // 部屋の壁
        const wallMaterial = new THREE.MeshPhongMaterial({ color: 0x777777 });
        
        // 奥の壁
        const backWallGeometry = new THREE.BoxGeometry(width, 4, 0.2);
        const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
        backWall.position.set(0, 2, -length/2);
        backWall.castShadow = true;
        backWall.receiveShadow = true;
        scene.add(backWall);
        
        // 手前の壁
        const frontWallGeometry = new THREE.BoxGeometry(width, 4, 0.2);
        const frontWall = new THREE.Mesh(frontWallGeometry, wallMaterial);
        frontWall.position.set(0, 2, length/2);
        frontWall.castShadow = true;
        frontWall.receiveShadow = true;
        scene.add(frontWall);
        
        // 左の壁
        const leftWallGeometry = new THREE.BoxGeometry(0.2, 4, length);
        const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
        leftWall.position.set(-width/2, 2, 0);
        leftWall.castShadow = true;
        leftWall.receiveShadow = true;
        scene.add(leftWall);
        
        // 右の壁
        const rightWallGeometry = new THREE.BoxGeometry(0.2, 4, length);
        const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);
        rightWall.position.set(width/2, 2, 0);
        rightWall.castShadow = true;
        rightWall.receiveShadow = true;
        scene.add(rightWall);
        
        // 天井
        const ceilingGeometry = new THREE.PlaneGeometry(width, length);
        const ceilingMaterial = new THREE.MeshPhongMaterial({ color: 0x555555, side: THREE.DoubleSide });
        const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = 4;
        ceiling.receiveShadow = true;
        scene.add(ceiling);
        
        // ドアの作成
        const doors = [];
        doorPositions.forEach(doorData => {
            // ドアの枠
            const doorFrameGeometry = new THREE.BoxGeometry(2, 3, 0.3);
            const doorFrameMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
            const doorFrame = new THREE.Mesh(doorFrameGeometry, doorFrameMaterial);
            doorFrame.position.copy(doorData.position);
            doorFrame.rotation.y = doorData.rotation || 0;
            scene.add(doorFrame);
            
            // ドア自体
            const doorGeometry = new THREE.BoxGeometry(1.6, 2.6, 0.1);
            const doorMaterial = new THREE.MeshPhongMaterial({ color: 0x3c2a1e });
            const door = new THREE.Mesh(doorGeometry, doorMaterial);
            door.position.copy(doorData.position);
            door.position.z += 0.1; // ドア枠の前に配置
            door.rotation.y = doorData.rotation || 0;
            door.userData = {
                isDoor: true,
                targetRoom: doorData.targetRoom,
                targetPosition: doorData.targetPosition,
                targetRotation: doorData.targetRotation
            };
            scene.add(door);
            doors.push(door);
        });
        
        // 光源の設定
        const ambientLight = new THREE.AmbientLight(0x404040);
        scene.add(ambientLight);
        
        const pointLight = new THREE.PointLight(0xffffff, 1, 20);
        pointLight.position.set(0, 3, 0);
        pointLight.castShadow = true;
        scene.add(pointLight);
        
        // 部屋情報を返す
        return {
            scene: scene,
            doors: doors,
            width: width,
            length: length
        };
    } catch (error) {
        console.error(`部屋${roomId}の作成中にエラーが発生しました:`, error);
        return null;
    }
}

// 部屋の初期化
function initRooms() {
    try {
        console.log("部屋を初期化中...");
        
        // 部屋1
        scenes.room1 = createRoom("room1", 10, 10, [
            { 
                position: new THREE.Vector3(0, 1.5, 5), 
                rotation: 0, 
                targetRoom: "room2",
                targetPosition: new THREE.Vector3(0, 0, -4),
                targetRotation: 0
            }
        ]);
        console.log("部屋1を作成しました");
        
        // 部屋2
        scenes.room2 = createRoom("room2", 12, 10, [
            { 
                position: new THREE.Vector3(0, 1.5, -5), 
                rotation: 0, 
                targetRoom: "room1",
                targetPosition: new THREE.Vector3(0, 0, 4),
                targetRotation: Math.PI
            },
            { 
                position: new THREE.Vector3(6, 1.5, 0), 
                rotation: Math.PI / 2, 
                targetRoom: "room3",
                targetPosition: new THREE.Vector3(-4, 0, 0),
                targetRotation: Math.PI / 2
            }
        ]);
        console.log("部屋2を作成しました");
        
        // 部屋3
        scenes.room3 = createRoom("room3", 10, 15, [
            { 
                position: new THREE.Vector3(-5, 1.5, 0), 
                rotation: Math.PI / 2, 
                targetRoom: "room2",
                targetPosition: new THREE.Vector3(5, 0, 0),
                targetRotation: -Math.PI / 2
            },
            { 
                position: new THREE.Vector3(0, 1.5, 7.5), 
                rotation: 0, 
                targetRoom: "room4",
                targetPosition: new THREE.Vector3(0, 0, -7.5),
                targetRotation: 0
            }
        ]);
        console.log("部屋3を作成しました");
        
        // 部屋4（ボス部屋）
        scenes.room4 = createRoom("room4", 16, 16, [
            { 
                position: new THREE.Vector3(0, 1.5, -8), 
                rotation: 0, 
                targetRoom: "room3",
                targetPosition: new THREE.Vector3(0, 0, 6.5),
                targetRotation: Math.PI
            }
        ]);
        console.log("部屋4（ボス部屋）を作成しました");
        
        console.log("全ての部屋の初期化が完了しました");
    } catch (error) {
        console.error("部屋の初期化中にエラーが発生しました:", error);
    }
}

// 部屋の切り替え
function changeRoom(targetRoomId, targetPosition, targetRotation) {
    try {
        gameState.isTransitioning = true;
        
        // ドアのアニメーション表示
        const doorTransition = document.getElementById('door-transition');
        const doorAnimation = document.getElementById('door-animation');
        const doorLeft = document.querySelector('.door-left');
        const doorRight = document.querySelector('.door-right');
        const doorText = document.getElementById('door-text');
        
        doorTransition.style.display = 'flex';
        doorAnimation.style.display = 'block';
        doorText.textContent = 'ドアを開いています...';
        
        // ドアを開くアニメーション
        setTimeout(() => {
            doorLeft.style.transform = 'rotateY(90deg)';
            doorRight.style.transform = 'rotateY(-90deg)';
            doorText.textContent = 'ドアを通過中...';
        }, 500);
        
        // 部屋の切り替え
        setTimeout(() => {
            console.log(`部屋を切り替え中: ${targetRoomId}に移動します`);
            
            // 現在の部屋からプレイヤーモデルを削除
            if (gameState.currentRoom) {
                gameState.currentRoom.remove(player.model);
            }
            
            // 弾丸を削除
            bullets.forEach(bullet => {
                if (bullet.mesh && bullet.mesh.parent) {
                    bullet.mesh.parent.remove(bullet.mesh);
                }
            });
            bullets.length = 0;
            
            // ゾンビを削除
            zombies.forEach(zombie => {
                if (zombie.mesh && zombie.mesh.parent) {
                    zombie.mesh.parent.remove(zombie.mesh);
                }
            });
            zombies.length = 0;
            
            // 新しい部屋にプレイヤーを追加
            const targetRoom = scenes[targetRoomId];
            if (!targetRoom) {
                console.error(`部屋 ${targetRoomId} が見つかりません`);
                return;
            }
            
            gameState.currentRoom = targetRoom.scene;
            gameState.currentRoom.add(player.model);
            
            // プレイヤーの位置と向きを設定
            player.position.copy(targetPosition);
            player.model.position.copy(player.position);
            
            // プレイヤーの向きを設定
            player.direction.set(Math.sin(targetRotation), 0, Math.cos(targetRotation)).normalize();
            player.model.rotation.y = targetRotation;
            
            // ゾンビの生成
            if (targetRoomId === 'room4') {
                // ボス部屋にはボスゾンビを追加
                spawnBossZombie(targetRoom.width, targetRoom.length, player.position);
                // 通常のゾンビも少し追加
                spawnZombiesInRoom(targetRoomId, targetRoom.width, targetRoom.length, player.position);
            } else {
                // 通常の部屋
                spawnZombiesInRoom(targetRoomId, targetRoom.width, targetRoom.length, player.position);
            }
            
            // カメラをプレイヤーの後ろに配置
            updateCameraPosition();
            
            // ドアを閉じるアニメーション
            doorText.textContent = 'ドアを閉じています...';
            doorLeft.style.transform = 'rotateY(0deg)';
            doorRight.style.transform = 'rotateY(0deg)';
        }, 2000);
        
        // トランジション終了
        setTimeout(() => {
            doorAnimation.style.display = 'none';
            doorTransition.style.display = 'none';
            gameState.isTransitioning = false;
            console.log("部屋の切り替えが完了しました");
        }, 3500);
    } catch (error) {
        console.error("部屋の切り替え中にエラーが発生しました:", error);
        gameState.isTransitioning = false;
    }
}

// ウィンドウのリサイズ処理
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// キーボード入力処理
function onKeyDown(event) {
    switch (event.key.toLowerCase()) {
        case 'w': keyState.w = true; break;
        case 'a': keyState.a = true; break;
        case 's': keyState.s = true; break;
        case 'd': keyState.d = true; break;
        case 'shift': keyState.shift = true; break;
        case 'e': keyState.e = true; break;
        case 'r': keyState.r = true; break;
    }
}

function onKeyUp(event) {
    switch (event.key.toLowerCase()) {
        case 'w': keyState.w = false; break;
        case 'a': keyState.a = false; break;
        case 's': keyState.s = false; break;
        case 'd': keyState.d = false; break;
        case 'shift': keyState.shift = false; break;
        case 'e': keyState.e = false; break;
        case 'r': keyState.r = false; break;
    }
}

// ゲームの初期化
function initGame() {
    try {
        console.log("ゲーム初期化開始");
        
        // 部屋の作成
        initRooms();
        
        // プレイヤーモデルの作成
        console.log("プレイヤーモデルを作成中...");
        createPlayerModel();
        
        // 最初の部屋を設定
        console.log("最初の部屋を設定中...");
        gameState.currentRoom = scenes.room1.scene;
        gameState.currentRoom.add(player.model);
        player.position.set(0, 0, 0);
        player.model.position.copy(player.position);
        
        // 最初のゾンビを生成
        console.log("最初のゾンビを生成中...");
        const zombie = new Zombie(new THREE.Vector3(3, 0, -3));
        zombies.push(zombie);
        
        // イベントリスナーの設定
        console.log("イベントリスナーを設定中...");
        window.addEventListener('resize', onWindowResize);
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        
        // ロード完了
        console.log("ロード完了");
        gameState.isLoading = false;
        document.getElementById('loading-screen').style.display = 'none';
        
        // アニメーションループの開始
        console.log("アニメーション開始");
        animate();
    } catch (error) {
        console.error("ゲーム初期化中にエラーが発生しました:", error);
        alert("ゲームの読み込み中にエラーが発生しました。ページを更新してください。");
    }
}

// アニメーションループ
function animate() {
    requestAnimationFrame(animate);
    
    if (!gameState.isLoading && !gameState.isTransitioning) {
        updatePlayer();
        updateCameraPosition();
        updateBullets();
        updateZombies();
    }
    
    renderer.render(gameState.currentRoom, camera);
}

// ページが完全に読み込まれてから開始
window.addEventListener('load', function() {
    console.log("ページの読み込みが完了しました。ゲームを開始します。");
    // 少し遅延を入れて確実にDOM要素が利用可能になってから初期化
    setTimeout(initGame, 500);
});