// enemies.js - ゾンビと敵関連の処理
if (typeof THREE === 'undefined' && typeof window.THREE !== 'undefined') {
    var THREE = window.THREE;
}

// ゾンビクラス
class Zombie {
    constructor(position) {
        try {
            this.position = position.clone();
            this.speed = 0.02 + Math.random() * 0.02;
            this.health = 100;
            this.isDead = false;
            
            // ゾンビのモデル（仮のボックス）
            const geometry = new THREE.BoxGeometry(0.8, 1.8, 0.5);
            const material = new THREE.MeshPhongMaterial({ color: 0x00aa00 });
            this.mesh = new THREE.Mesh(geometry, material);
            this.mesh.position.copy(this.position);
            this.mesh.position.y = 0.9; // 地面からの高さ調整
            this.mesh.castShadow = true;
            this.mesh.receiveShadow = true;
            
            if (!gameState.currentRoom) {
                console.error("現在の部屋が設定されていません");
                return;
            }
            
            gameState.currentRoom.add(this.mesh);
            
            // 腕を追加
            const armGeometry = new THREE.BoxGeometry(0.2, 0.7, 0.2);
            const armMaterial = new THREE.MeshPhongMaterial({ color: 0x009900 });
            
            this.leftArm = new THREE.Mesh(armGeometry, armMaterial);
            this.leftArm.position.set(-0.5, 0, 0);
            this.leftArm.castShadow = true;
            this.mesh.add(this.leftArm);
            
            this.rightArm = new THREE.Mesh(armGeometry, armMaterial);
            this.rightArm.position.set(0.5, 0, 0);
            this.rightArm.castShadow = true;
            this.mesh.add(this.rightArm);
            
            // 頭を追加
            const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
            const headMaterial = new THREE.MeshPhongMaterial({ color: 0x008800 });
            this.head = new THREE.Mesh(headGeometry, headMaterial);
            this.head.position.set(0, 0.7, 0);
            this.head.castShadow = true;
            this.mesh.add(this.head);
        } catch (error) {
            console.error("ゾンビの作成中にエラーが発生しました:", error);
        }
    }
    
    update() {
        if (this.isDead || !this.mesh) return false;
        
        try {
            // プレイヤーの方向に向かって移動
            const directionToPlayer = new THREE.Vector3()
                .subVectors(player.position, this.position)
                .normalize();
            
            this.position.addScaledVector(directionToPlayer, this.speed);
            this.mesh.position.x = this.position.x;
            this.mesh.position.z = this.position.z;
            
            // プレイヤーの方を向く
            this.mesh.lookAt(player.position.x, this.mesh.position.y, player.position.z);
            
            // 腕を振る動作
            const time = Date.now() * 0.003;
            this.leftArm.rotation.x = Math.sin(time) * 0.5;
            this.rightArm.rotation.x = Math.sin(time + Math.PI) * 0.5;
            
            // プレイヤーとの衝突判定
            const distanceToPlayer = this.position.distanceTo(player.position);
            if (distanceToPlayer < player.radius + 0.5) {
                // プレイヤーにダメージ
                gameState.health -= 0.5;
                if (gameState.health <= 0) {
                    gameState.health = 0;
                    // ゲームオーバー処理
                    displayGameOver();
                }
                updateHealthBar();
            }
            
            return true;
        } catch (error) {
            console.error("ゾンビの更新中にエラーが発生しました:", error);
            return false;
        }
    }
    
    takeDamage(damage) {
        this.health -= damage;
        if (this.health <= 0) {
            this.die();
            return true;
        }
        return false;
    }
    
    die() {
        this.isDead = true;
        gameState.zombiesKilled++;
        
        // 死亡アニメーション（単純に消える）
        if (this.mesh && this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
    }
}

// ゾンビの配列
const zombies = [];

// ゾンビの更新
function updateZombies() {
    for (let i = zombies.length - 1; i >= 0; i--) {
        const zombie = zombies[i];
        const isActive = zombie.update();
        
        if (!isActive) {
            zombies.splice(i, 1);
        }
    }
}

// ゾンビの生成（部屋ごとに異なる数）
function spawnZombiesInRoom(roomId, roomWidth, roomLength, playerPosition) {
    const zombieCount = roomId === 'room4' ? 5 : Math.floor(Math.random() * 3) + 1;
    console.log(`部屋 ${roomId} にゾンビを ${zombieCount} 体生成します`);
    
    for (let i = 0; i < zombieCount; i++) {
        // ランダムな位置にゾンビを生成（プレイヤーから少し離れた位置）
        let zombieX, zombieZ;
        do {
            zombieX = (Math.random() - 0.5) * (roomWidth - 2);
            zombieZ = (Math.random() - 0.5) * (roomLength - 2);
        } while (
            Math.abs(zombieX - playerPosition.x) < 3 && 
            Math.abs(zombieZ - playerPosition.z) < 3
        );
        
        const zombiePosition = new THREE.Vector3(zombieX, 0, zombieZ);
        const zombie = new Zombie(zombiePosition);
        zombies.push(zombie);
    }
}

// ボス部屋での強化ゾンビの生成
function spawnBossZombie(roomWidth, roomLength, playerPosition) {
    // ボスゾンビの位置（部屋の中央付近）
    const bossPosition = new THREE.Vector3(0, 0, -roomLength / 4);
    
    // 通常のゾンビを生成して設定を変更
    const bossZombie = new Zombie(bossPosition);
    
    // ボスゾンビの特性
    bossZombie.health = 500; // 体力5倍
    bossZombie.speed = 0.01; // 少し遅く
    
    // ボスゾンビの見た目を変更
    bossZombie.mesh.scale.set(1.5, 1.5, 1.5); // サイズを大きく
    
    // 色を赤っぽく
    bossZombie.mesh.material.color.setHex(0xaa0000);
    bossZombie.leftArm.material.color.setHex(0x990000);
    bossZombie.rightArm.material.color.setHex(0x990000);
    bossZombie.head.material.color.setHex(0x880000);
    
    zombies.push(bossZombie);
    
    console.log("ボスゾンビを生成しました");
    return bossZombie;
}

// ゲームオーバー処理
function displayGameOver() {
    const gameOverDiv = document.createElement('div');
    gameOverDiv.style.position = 'absolute';
    gameOverDiv.style.top = '0';
    gameOverDiv.style.left = '0';
    gameOverDiv.style.width = '100%';
    gameOverDiv.style.height = '100%';
    gameOverDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    gameOverDiv.style.color = '#ff0000';
    gameOverDiv.style.display = 'flex';
    gameOverDiv.style.flexDirection = 'column';
    gameOverDiv.style.justifyContent = 'center';
    gameOverDiv.style.alignItems = 'center';
    gameOverDiv.style.zIndex = '100';
    gameOverDiv.style.fontSize = '32px';
    gameOverDiv.innerHTML = `
        <h1>GAME OVER</h1>
        <p>撃破したゾンビ: ${gameState.zombiesKilled}</p>
        <button id="restart-button" style="padding: 10px 20px; font-size: 20px; margin-top: 20px; cursor: pointer;">リスタート</button>
    `;
    document.body.appendChild(gameOverDiv);
    
    document.getElementById('restart-button').addEventListener('click', () => {
        location.reload();
    });
}