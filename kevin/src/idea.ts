import { z } from "zod";
import axios from "axios";
// import OpenAI from "openai";
import Groq from 'groq-sdk';

import { defineDAINService, ToolConfig } from "@dainprotocol/service-sdk";

import {
    CardUIBuilder,
    TableUIBuilder,
    MapUIBuilder,
    LayoutUIBuilder,
} from "@dainprotocol/utils";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const validateIdea: ToolConfig = {
    id: "validate-idea",
    name: "Validate Idea",
    description: "Given the user's idea it expands on it and makes small checkpoints to be completed",
    input: z
        .object({
            prompt: z.string().describe("The prompt for the project to be built")
        })
        .describe("Input parameters to generate checkpoints for ideas"),
    output: z
        .object({
            expanded_idea: z.array(z.string()).describe("List of smaller checkpoints that need to be completed")
        })
        .describe("The idea the user inputted but expanded upon"),
    pricing: { pricePerUse: 0, currency: "USD" },
    handler: async (
        { prompt },
        agentInfo,
        context
    ) => {

        console.log(`Agent ${agentInfo.id} is expanding on idea ${prompt}`);

        // Chain of thought on Groq 

        const expanded_idea = await client.chat.completions.create({
            model: "mixtral-8x7b-32768",
            messages: [
                {
                    role: "system", 
                    content: "You are an AI Product Manager, your role is to take the idea given to you and expand on it. If a detail is not given, assume the simplest. Expand on the idea as much as you can, we'll be summarizing these ideas into bullet points later. Return only the description nothing more nothing less"
                },
                {
                    role: "user",
                    content: prompt
                }
            ]
        });

        const summarized_idea = await client.chat.completions.create({
            model: "mixtral-8x7b-32768",
            messages: [
                {
                    role: "system",
                    content: "You are an AI Product Manager, your job is to look at the description of the project given to you and break it down into smaller tasks that developers can complete. Only output the smaller tasks in a bulletpoint format, nothing else."
                },
                {
                    role: "user", 
                    content: expanded_idea.choices[0].message.content
                }
            ]
        });

        const structured_output = await client.chat.completions.create({
            model: "mixtral-8x7b-32768",
            messages: [
                {
                    role: "system",
                    content: "You are a structured output generator. Take the bullet points given to you and format them into an array of strings. Each bullet point should be its own string in the array. Your response must be valid JSON in the format: {\"tasks\": [\"task 1\", \"task 2\", ...]}."
                },
                {
                    role: "user",
                    content: summarized_idea.choices[0].message.content
                }
            ],
            response_format: { type: "json_object" }
        });

        const tasks = JSON.parse(structured_output.choices[0].message.content).tasks;

        return {
            text: `Generated ${tasks.length} tasks for your project idea`,
            data: {
                expanded_idea: tasks
            },
            ui: new CardUIBuilder()
                .title("Project Tasks")
                .content(tasks.map((task, index) => `${index + 1}. ${task}`).join('\n'))
                .build()
        }
    },
};