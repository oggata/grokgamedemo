// characters.js - プレイヤーと弾丸の管理

// プレイヤーの設定
const player = {
    model: null,
    speed: 0.1,
    turnSpeed: 0.05,
    direction: new THREE.Vector3(0, 0, -1),
    position: new THREE.Vector3(0, 0, 0),
    canShoot: true,
    shootCooldown: 500,  // ミリ秒
    lastShootTime: 0,
    height: 1.7,
    radius: 0.5,
    gun: null
};

// 弾丸クラス
class Bullet {
    constructor(position, direction) {
        this.position = position.clone();
        this.direction = direction.normalize();
        this.speed = 0.5;
        this.lifeTime = 2000; // ミリ秒
        this.createTime = Date.now();
        
        // 弾丸のメッシュ
        const geometry = new THREE.SphereGeometry(0.05, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        gameState.currentRoom.add(this.mesh);
    }
    
    update() {
        if (Date.now() - this.createTime > this.lifeTime) {
            return false; // 弾丸の寿命が尽きた
        }
        
        this.position.addScaledVector(this.direction, this.speed);
        this.mesh.position.copy(this.position);
        
        return true; // 弾丸はまだ有効
    }
    
    remove() {
        if (this.mesh && this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
    }
}

// 弾丸の配列
const bullets = [];

// プレイヤーモデルの作成
function createPlayerModel() {
    try {
        // プレイヤーの体
        const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8);
        const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x0000aa });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.6;
        body.castShadow = true;
        
        // プレイヤーの頭
        const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
        const headMaterial = new THREE.MeshPhongMaterial({ color: 0xffdddd });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.4;
        head.castShadow = true;
        
        // プレイヤーのグループ
        const playerGroup = new THREE.Group();
        playerGroup.add(body);
        playerGroup.add(head);
        
        // 銃のモデル
        const gunGroup = new THREE.Group();
        
        const gunBarrelGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.4);
        const gunMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
        const gunBarrel = new THREE.Mesh(gunBarrelGeometry, gunMaterial);
        gunBarrel.position.z = -0.3;
        gunGroup.add(gunBarrel);
        
        const gunHandleGeometry = new THREE.BoxGeometry(0.1, 0.2, 0.1);
        const gunHandle = new THREE.Mesh(gunHandleGeometry, gunMaterial);
        gunHandle.position.y = -0.15;
        gunGroup.add(gunHandle);
        
        gunGroup.position.set(0.5, 1.1, -0.2);
        playerGroup.add(gunGroup);
        
        player.gun = gunGroup;
        player.model = playerGroup;
        
        return playerGroup;
    } catch (error) {
        console.error("プレイヤーモデルの作成中にエラーが発生しました:", error);
        return null;
    }
}

// プレイヤーの更新
function updatePlayer() {
    if (gameState.isTransitioning || !player.model) return;
    
    let moveX = 0;
    let moveZ = 0;
    
    // 方向ベクトルの計算
    if (keyState.w) moveZ -= 1;
    if (keyState.s) moveZ += 1;
    if (keyState.a) moveX -= 1;
    if (keyState.d) moveX += 1;
    
    if (moveX !== 0 || moveZ !== 0) {
        // 正規化して斜め移動が速くなりすぎないようにする
        const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
        moveX /= length;
        moveZ /= length;
        
        // プレイヤーの向きを変更
        player.direction.set(moveX, 0, moveZ).normalize();
        player.model.rotation.y = Math.atan2(moveX, moveZ);
        
        // 移動
        const newX = player.position.x + moveX * player.speed;
        const newZ = player.position.z + moveZ * player.speed;
        
        // 壁との衝突判定
        const currentRoom = scenes[Object.keys(scenes).find(id => scenes[id].scene === gameState.currentRoom)];
        if (currentRoom) {
            const halfWidth = currentRoom.width / 2 - player.radius;
            const halfLength = currentRoom.length / 2 - player.radius;
            
            // X座標の制限
            if (newX > -halfWidth && newX < halfWidth) {
                player.position.x = newX;
            }
            
            // Z座標の制限
            if (newZ > -halfLength && newZ < halfLength) {
                player.position.z = newZ;
            }
        }
        
        player.model.position.copy(player.position);
    }
    
    // 銃の発射処理
    if (keyState.shift && player.canShoot && gameState.ammo > 0) {
        const now = Date.now();
        if (now - player.lastShootTime > player.shootCooldown) {
            player.lastShootTime = now;
            
            // 弾丸を発射
            const bulletPosition = new THREE.Vector3()
                .copy(player.position)
                .add(new THREE.Vector3(
                    player.direction.x * 0.5,
                    player.height * 0.8,
                    player.direction.z * 0.5
                ));
            
            const bullet = new Bullet(bulletPosition, player.direction);
            bullets.push(bullet);
            
            // 弾数を減らす
            gameState.ammo--;
            updateAmmoCounter();
            
            // 発射エフェクト（銃を少し後ろに下げる）
            player.gun.position.z += 0.05;
            setTimeout(() => {
                player.gun.position.z -= 0.05;
            }, 50);
        }
    }
    
    // リロード処理
    if (keyState.r && gameState.ammo < gameState.maxAmmo) {
        gameState.ammo = gameState.maxAmmo;
        updateAmmoCounter();
    }
    
    // ドアとの相互作用
    if (keyState.e && !gameState.isTransitioning) {
        const currentRoom = scenes[Object.keys(scenes).find(id => scenes[id].scene === gameState.currentRoom)];
        
        if (currentRoom && currentRoom.doors) {
            currentRoom.doors.forEach(door => {
                // プレイヤーとドアの距離を計算
                const distance = player.position.distanceTo(door.position);
                
                if (distance < 2 && door.userData) {
                    // ドアを通過
                    changeRoom(
                        door.userData.targetRoom,
                        door.userData.targetPosition,
                        door.userData.targetRotation
                    );
                }
            });
        }
    }
}

// カメラの更新
function updateCameraPosition() {
    if (!player.model) return;
    
    // プレイヤーの後ろに配置
    const cameraOffset = new THREE.Vector3()
        .copy(player.direction)
        .multiplyScalar(-4) // 後ろに4ユニット
        .add(new THREE.Vector3(0, 2, 0)); // 上に2ユニット
    
    camera.position.copy(player.position).add(cameraOffset);
    camera.lookAt(
        player.position.x,
        player.position.y + player.height * 0.7,
        player.position.z
    );
}

// 弾丸の更新
function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        // 弾丸の更新
        const isActive = bullet.update();
        
        // 弾丸が寿命を過ぎたら削除
        if (!isActive) {
            bullet.remove();
            bullets.splice(i, 1);
            continue;
        }
        
        // ゾンビとの衝突判定
        for (let j = zombies.length - 1; j >= 0; j--) {
            const zombie = zombies[j];
            if (zombie.isDead) continue;
            
            // 弾丸とゾンビの距離を計算
            const distance = bullet.position.distanceTo(zombie.position);
            if (distance < 0.8) { // ゾンビのサイズに合わせて調整
                // ゾンビにダメージ
                const killed = zombie.takeDamage(50);
                
                // 弾丸を削除
                bullet.remove();
                bullets.splice(i, 1);
                
                // ゾンビが死亡したら配列から削除
                if (killed) {
                    zombies.splice(j, 1);
                }
                
                break;
            }
        }
    }
}

// UI更新関数
function updateHealthBar() {
    const healthFill = document.getElementById('health-fill');
    if (!healthFill) return;
    
    const healthPercent = (gameState.health / gameState.maxHealth) * 100;
    healthFill.style.width = `${healthPercent}%`;
    
    // 体力に応じて色を変更
    if (healthPercent > 60) {
        healthFill.style.backgroundColor = '#00cc00';
    } else if (healthPercent > 30) {
        healthFill.style.backgroundColor = '#cccc00';
    } else {
        healthFill.style.backgroundColor = '#cc0000';
    }
}

function updateAmmoCounter() {
    const ammoCounter = document.getElementById('ammo-counter');
    if (!ammoCounter) return;
    
    ammoCounter.textContent = `弾数: ${gameState.ammo} / ${gameState.maxAmmo}`;
}