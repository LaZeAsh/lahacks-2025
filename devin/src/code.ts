// Manages coding system for Devin Software Engineer

import { z } from "zod";
import axios from "axios";
import Groq from 'groq-sdk';
import fs from 'fs';
import path from "path";

import { defineDAINService, ToolConfig } from "@dainprotocol/service-sdk";

import {
    CardUIBuilder,
    TableUIBuilder,
    MapUIBuilder,
    LayoutUIBuilder,
} from "@dainprotocol/utils";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const writeCode: ToolConfig = {
    id: "write-code",
    name: "Write Code",
    description: "Generates code to solve a GitHub issue based on provided context and pushes it to the repository",
    input: z
        .object({
            issueContext: z.string().describe("The GitHub issue description and requirements that need to be implemented"),
            codeContext: z.string().describe("Relevant code files and their contents that provide context for the implementation"),
            repoURL: z.string().describe("The GitHub repository URL to push changes to")
        })
        .describe("Context needed to generate appropriate code solution"),
    output: z
        .object({
            listOutputs: z.array(z.object({
                fileName: z.string().describe("Name of the file that was modified"),
                fileContent: z.string().describe("The complete updated content of the modified file")
            })),
            commits: z.array(z.object({
                sha: z.string().describe("Commit SHA"),
                url: z.string().describe("Commit URL")
            }))
        })
        .describe("The generated code solution and commit information"),
    pricing: { pricePerUse: 0, currency: "USD" },
    handler: async (
        { issueContext, codeContext, repoURL },
        agentInfo,
        context
    ) => {
        if (!client) {
            throw new Error("GROQ_API_KEY environment variable is required for code generation");
        }

        if (!process.env.GITHUB_TOKEN) {
            throw new Error("GITHUB_TOKEN environment variable is required for pushing changes");
        }

        const codeGenerated = await client.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system", 
                    content: "You are an AI Software Engineer, your role is to take the code and issue context given to you and solve the github issue. If a detail is not given, assume the simplest. Return the fileName and the full file content of the file that's being changed and nothing else"
                },
                {
                    role: "user",
                    content: `Github Issue:\n${issueContext}\nCode Context:\n${codeContext}`
                }
            ]
        });

        const output = await client.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: "You are an AI Code Reviewer, look at the output generated + the github issue content. Make sure the code solves the github issue in question, if there's any obvious bugs fix them. Return the output in valid JSON format with the following structure: {\"listOutputs\": [{\"fileName\": \"string\", \"fileContent\": \"string\"}]}"
                },
                {
                    role: "user", 
                    content: `Github Issue:\n${issueContext}\nCode Generated:${codeGenerated.choices[0].message.content}`
                }
            ],
            response_format: { type: "json_object" }
        });

        const object = JSON.parse(output.choices[0].message.content as string);

        // Push changes to GitHub
        const urlParts = repoURL.replace("https://github.com/", "").split("/");
        const owner = urlParts[0];
        const repo = urlParts[1];

        interface Commit {
            sha: string;
            url: string;
        }

        const commits: Commit[] = [];
        for (const file of object.listOutputs) {
            // First get the current file (if it exists) to get its SHA
            let currentFileSHA;
            try {
                const fileResponse = await axios.get(
                    `https://api.github.com/repos/${owner}/${repo}/contents/${file.fileName}`,
                    {
                        headers: {
                            'Accept': 'application/vnd.github.v3+json',
                            'Authorization': `token ${process.env.GITHUB_TOKEN}`
                        }
                    }
                );
                currentFileSHA = fileResponse.data.sha;
            } catch (error: any) {
                // File doesn't exist yet, which is fine
            }

            // Push the change
            const response = await axios.put(
                `https://api.github.com/repos/${owner}/${repo}/contents/${file.fileName}`,
                {
                    message: `fix: Automated code update for issue\n\n${issueContext.split('\n')[0]}`,
                    content: Buffer.from(file.fileContent).toString('base64'),
                    ...(currentFileSHA && { sha: currentFileSHA })
                },
                {
                    headers: {
                        'Accept': 'application/vnd.github.v3+json',
                        'Authorization': `token ${process.env.GITHUB_TOKEN}`
                    }
                }
            );

            commits.push({
                sha: response.data.commit.sha,
                url: response.data.commit.html_url
            });
        }

        return {
            text: `Generated and pushed ${object.listOutputs.length} file modifications`,
            data: {
                listOutputs: object.listOutputs,
                commits
            },
            ui: new CardUIBuilder()
                .title("Code Changes")
                .content(
                    object.listOutputs.map((output: any, index: number) => 
                        `${index + 1}. Modified ${output.fileName} (Commit: ${commits[index].sha.substring(0, 7)})`
                    ).join('\n')
                )
                .build()
        }
    },
};