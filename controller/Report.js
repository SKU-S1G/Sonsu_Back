// import { fetchReportData, weeklyPromptData } from "../utils/Report.js";
// import { config } from "dotenv";
// import OpenAI from "openai";

// config();
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// export const weeklyReport = async (req, res) => {
//   const userId = req.user_id;

//   try {
//     const data = await fetchReportData(userId);
//     const prompt = weeklyPromptData(data);

//     const completion = await openai.chat.completions.create({
//       model: "gpt-4",
//       messages: [
//         { role: "system", content: "당신은 교육 분석 도우미입니다." },
//         { role: "user", content: prompt },
//       ],
//     });

//     const report = completion.choices[0].message.content;

//     res.json({
//       report,
//       lessonCount: data.lessonCount,
//     });
//   } catch (err) {
//     console.error("GPT 분석 실패:", err);
//     res.status(500).json({ message: "주간 리포트 생성 실패" });
//   }
// };
