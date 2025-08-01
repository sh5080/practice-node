import { MainGame, Users } from "./mainGame";



export class SeoulGame extends MainGame {
  constructor() {
    const users: Users[] = [
      { name: "seoul1", correctRate: 75 },
      { name: "seoul2", correctRate: 90 },
      { name: "seoul3", correctRate: 75 },
      { name: "seoul4", correctRate: 70 },
    ];
    
    super(users, 500, "hard");
  }
}

// // 게임 실행
// const data = new SeoulGame();
// const go = data.doGame();
// console.log("result: ", go); 