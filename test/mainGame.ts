import { do369 } from "./369";

export interface Users {
  name: string;
  correctRate: number;
}

export class MainGame {
  constructor(
    public users: Users[],
    public endNum: number,
    public strategy: "hard" | "easy"
  ) {}
  doGame() {
    let count = 1;
    let result = true;
    while (count <= this.endNum) {
      for (let i = 0; i < this.users.length; i++) {
        const currentNumber = count + i;
        const correctAnswer = do369(currentNumber);
        
        // 유저가 답할 내용 (랜덤하게 틀릴 수 있음)
        let userAnswer: string | number;
        const correctRate = Math.random() * 100;
        
        if (correctRate <= this.users[i].correctRate) {
          userAnswer = correctAnswer;
        } else {
          userAnswer = typeof correctAnswer === "string" ? currentNumber : "clap";
        }
        
        // console.log(this.users[i].name, ":", userAnswer, "/", "correct: ", correctAnswer);
        process.stdout.write(`${Date.now()} ${this.users[i].name} : ${userAnswer} / correct: ${correctAnswer}\n`);
        if (this.strategy === "easy") {
          result = typeof userAnswer === typeof correctAnswer;
        } else if (this.strategy === "hard") {
          result = userAnswer === correctAnswer;
        }
        
        if (!result) return this.users[i].name; // 걸린 유저명 리턴
      }
      count += this.users.length;
    }
    return "success"; // 모든 유저 정답
  }
}
