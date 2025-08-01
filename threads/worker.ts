import { parentPort, workerData } from "worker_threads";
import { BusanGame } from "../test/busanGame";
import { SeoulGame } from "../test/seoulGame";
import { DaeguGame } from "../test/daeguGame";

export async function worker() {
  const { gameType } = workerData;
  
  const startTime = Date.now();
  console.log(`[${gameType}] 워커 함수 실행됨! (${startTime})`);
  console.log(`[${gameType}] 워커 시작: ${gameType}`);
  
  try {
    let game;
    
    let result;
    
    switch (gameType) {
      case 'busan':
        game = new BusanGame();
        result = game.doGame();
        console.log(`부산 게임 실행 완료:`, result);
        break;
      case 'seoul':
        game = new SeoulGame();
        result = game.doGame();
        console.log(`서울 게임 실행 완료:`, result);
        break;
      case 'daegu':
        game = new DaeguGame();
        result = game.doGame();
        console.log(`대구 게임 실행 완료:`, result);
        break;
      default:
        throw new Error(`Unknown game type: ${gameType}`);
    }
    
    console.log(`게임 인스턴스 생성 성공`);
    
    parentPort?.postMessage({ success: true, result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`워커 에러:`, errorMessage);
    parentPort?.postMessage({ success: false, error: errorMessage });
  }
}

worker();


