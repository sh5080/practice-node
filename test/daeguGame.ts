import { MainGame, Users } from "./mainGame";


export class DaeguGame extends MainGame {
  constructor() {
    const users: Users[] = [
      { name: "daegu1", correctRate: 90 },
      { name: "daegu2", correctRate: 85 },
      { name: "daegu3", correctRate: 80 },
    ];
    
    super(users, 75, "easy");
  }

  // 대구 게임만의 특별한 기능
  doGameWithBonus(): string | Users {
    console.log("대구 게임 시작! 특별 보너스 라운드 포함");
    const result = this.doGame();
    
    if (result === "success") {
      console.log("🎉 대구 게임 성공! 보너스 점수 획득!");
    }
    
    return result;
  }
}

// // 게임 실행
// const data = new DaeguGame();
// const go = data.doGameWithBonus();
// console.log("result: ", go); 