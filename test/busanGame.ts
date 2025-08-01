import { MainGame, Users } from "./mainGame";

export class BusanGame extends MainGame {
  constructor() {
    const users: Users[] = [
      { name: "busan1", correctRate: 100 },
      { name: "busan2", correctRate: 95 },
      // { name: "busan3", correctRate: 90 },
      // { name: "busan4", correctRate: 85 },
      // { name: "busan5", correctRate: 80 },
      // { name: "busan6", correctRate: 75 },
      // { name: "busan7", correctRate: 70 },
      // { name: "busan8", correctRate: 65 },
      // { name: "busan9", correctRate: 60 },
    ];
    
    super(users, 1000, "easy");
  }
}

// // 게임 실행
// const data = new BusanGame();
// const go = data.doGame();
// console.log("result: ", go);