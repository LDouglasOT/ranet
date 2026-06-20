import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry and standard API key structure
let ai: GoogleGenAI | null = null;

if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });
    console.log("Successfully initialized full-stack GoogleGenAI client.");
  } catch (err) {
    console.error("Initialization error with GoogleGenAI:", err);
  }
} else {
  console.warn("⚠️ Warning: GEMINI_API_KEY env is not set. Server will operate in high-fidelity simulation model mode.");
}

// REST API for Academic Insights Generator
app.post("/api/insights/generate", async (req, res) => {
  const { type, studentData, classData, subject } = req.body;

  try {
    let prompt = "";

    if (type === "student") {
      const { name, testScore, midScore, endScore, finalGrade, finalWeighted } = studentData;
      prompt = `
        You are an expert academic evaluator and teacher at Kampala Primary School.
        Analyze this individual student's performance trends this term:
        - Student Name: ${name}
        - Subject: ${subject}
        - Quiz Score (20% weight): ${testScore || 'N/A'}%
        - Mid-Term exam (30% weight): ${midScore || 'N/A'}%
        - Term-End Final Exam (50% weight): ${endScore || 'N/A'}%
        - Overall Class Standard Score: ${finalWeighted}% (Grade Assigned: ${finalGrade})

        Provide a very professional, warm, constructive, and actionable academic feedback summary (2 to 3 sentences maximum) meant for the student's parents. 
        Focus strictly on the student's progress and highlight a clear recommendation or tip for home support. Avoid generic feedback; mention specific academic concepts related to ${subject} if a score suggests a drop or a rise. Keep the language humble and clear.
      `;
    } else if (type === "class") {
      const { classStream, studentSummaryList, classAverage, classMax, classMin } = classData;
      const formattedStudents = studentSummaryList
        .map((s: any) => `- Name: ${s.name}, Score: ${s.weighted}%, Grade: ${s.grade}`)
        .join("\n");

      prompt = `
        You are a clinical educational psychologist and senior registrar at Kampala Primary School.
        Analyze this collective class stream's performance statistics this term:
        - Class Stream: ${classStream}
        - Subject Area: ${subject}
        - General Class Mean: ${classAverage}%
        - High Score Achieved: ${classMax}%
        - Low Score Achieved: ${classMin}%
        
        Student List and Final Term Output:
        ${formattedStudents}

        Please generate a strategic academic insight analysis report for this class. Include:
        1. **Overview Assessment**: A 1-2 sentence high-level narrative summary of how the stream performed on average in ${subject}.
        2. **Notable Trajectories**: Mentioning high peaks or critical clusters (e.g., whether the bulk is passing or struggling).
        3. **Remedial Focus recommendations for Parents**: Identify specific academic sub-topics or homework focus areas where they can cooperate with the school.
        
        Style: Format with clean bullet points. Keep it professional, objective, encouraging yet honest. Limit to 150-200 words.
      `;
    } else {
      return res.status(400).json({ error: "Invalid type request" });
    }

    if (ai) {
      console.log(`Sending prompt to gemini-3.5-flash for type [${type}]`);
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      const extractedText = response.text || "";
      return res.json({ 
        success: true, 
        insights: extractedText,
        isSimulated: false
      });
    } else {
      // High-Fidelity local simulation when GEMINI_API_KEY is not defined, 
      // ensuring elegant visual demonstration without cracking or breaking!
      console.log(`Generating high-fidelity simulation feedback for type [${type}]`);
      let simulatedInsights = "";

      if (type === "student") {
        const { name, testScore, midScore, endScore, finalGrade, finalWeighted } = studentData;
        const weightedNum = parseFloat(finalWeighted) || 0;
        
        if (weightedNum >= 80) {
          simulatedInsights = `${name} has produced outstanding research and technical outputs in ${subject} this term, demonstrating highly advanced proficiency. Their end-term result of ${endScore}% highlights an exceptional grasp of key curriculum principles. To sustain this momentum, encouraging them to tackle more complex logic projects will deepen their passion.`;
        } else if (weightedNum >= 60) {
          simulatedInsights = `${name} displays reliable consistency and progress in ${subject}, achieving a healthy terminal average of ${finalWeighted}%. Their classwork is diligent, though a focus on revising exam-taking strategies can elevate their end-of-term score of ${endScore || 0}%. We recommend continuing with structured homework reviews to reinforce key formulas.`;
        } else {
          simulatedInsights = `${name} is showing potential but requires robust support in core ${subject} modules, currently holding a terminal score of ${finalWeighted}%. A downward trend from quizzes to the end-of-term exam indicates an immediate requirement for targeted remediation on foundational concepts. Daily math reviews and active workbook practices at home will help bridge these understanding gaps.`;
        }
      } else {
        const { classStream, classAverage, classMax } = classData;
        simulatedInsights = `### 🌟 CLASSWISE TREND INSIGHTS: ${classStream} (${subject})\n\n` +
          `*   **Overview Assessment**: P.5 grade-level benchmarks indicate solid mastery in ${subject}, showing an encouraging overall average of **${classAverage}%**. The highest mark recorded was a stellar ${classMax}%.\n` +
          `*   **Notable Trajectories**: The majority of pupils achieved C (Good Credit) or higher. Student score trends showed that regular intermediate quizzes acted as positive stabilizers for finals.\n` +
          `*   **Actionable Remedial Strategy**: We recommend parents assist their children in practicing daily word problem problems. A unified focus on basic word translation arithmetic will solidify the core foundation for subsequent terms.`;
      }

      // We explicitly state that the system operates in "Live Demo (Simulated AI Mode)" 
      // but still provide fully relevant, dynamic outputs!
      return res.json({
        success: true,
        insights: simulatedInsights,
        isSimulated: true,
        notice: "Notice: Operating in offline high-fidelity simulation model. Provide GEMINI_API_KEY in Settings > Secrets to activate real live Gemini instances."
      });
    }
  } catch (error: any) {
    console.error("Express Gemini API Error handler:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message || "Unknown error occurred on the server."
    });
  }
});

// Configure Vite integration as middleware when in development mode
async function bootstrapServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware integrated successfully with Express.");
  } else {
    // Production asset distribution route
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Production static file directory linked securely.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 [Full-Stack Server] Kampala Academic operational on http://localhost:${PORT}`);
  });
}

bootstrapServer().catch((e) => {
  console.error("Critical server bootstrap collapse:", e);
});
