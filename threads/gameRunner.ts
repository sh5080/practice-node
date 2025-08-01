import { Worker } from "worker_threads";
import * as path from "path";

export class GameRunner {
  static async runMultipleGames() {
    const games = [
      { name: "부산", gameType: "busan" },
      { name: "서울", gameType: "seoul" },
    //   { name: "대구", gameType: "daegu" }
    ];

    // 모든 워커를 먼저 생성
    const workerPromises = games.map((game) => {
      return new Promise((resolve, reject) => {
        console.log(`워커 생성 시작: ${game.name}, ${game.gameType}`);
        
        const workerPath = path.resolve(__dirname, 'worker.js');
        const worker = new Worker(workerPath, {
          workerData: {
            gameType: game.gameType,
            params: {}
          }
        });

        worker.on('message', (message) => {
          console.log(`${game.name} 워커 메시지 수신:`, message);
          if (message.success) {
            console.log(`${game.name} 게임 결과:`, message.result);
            resolve({ city: game.name, result: message.result });
          } else {
            console.error(`${game.name} 게임 에러:`, message.error);
            reject(new Error(`${game.name} 게임 실패: ${message.error}`));
          }
        });

        worker.on('error', (error) => {
          console.error(`${game.name} 워커 에러:`, error);
          reject(error);
        });
        
        worker.on('exit', (code) => {
          console.log(`${game.name} 워커 종료: 코드 ${code}`);
          if (code !== 0) {
            reject(new Error(`Worker stopped with exit code ${code}`));
          }
        });
      });
    });

    try {
      const results = await Promise.all(workerPromises);
      console.log("모든 게임 완료!");
      return results;
    } catch (error) {
      console.error("게임 실행 중 에러:", error);
      throw error;
    }
  }
}

// 실행 예시
if (require.main === module) {
  GameRunner.runMultipleGames()
    .then(results => console.log("최종 결과:", results))
    .catch(error => console.error("실행 실패:", error));
} 