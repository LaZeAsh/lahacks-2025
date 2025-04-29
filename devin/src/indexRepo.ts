// Manages file system for Devin Software Engineer

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

export const indexRepo: ToolConfig = {
    id: "index-repo",
    name: "Index Repositories",
    description: "Given the repositories it indexes the repository for better results",
    input: z
        .object({
            repositoryURL: z.string().describe("")
        })
        .describe("Input parameters to read the contents of the file"),
    output: z
        .object({
            expanded_idea: z.string().describe("The content of the file")
        })
        .describe("What the file entails"),
    pricing: { pricePerUse: 0, currency: "USD" },
    handler: async (
        { fileName },
        agentInfo,
        context
    ) => {

        // Check if file exists
        if (!fs.existsSync(fileName)) {
            throw new Error(`File ${fileName} does not exist`);
        }
        // Read file contents
        const fileContent = fs.readFileSync(fileName, 'utf8');

        return {
            text: `Accessed the ${fileName} file content\n${fileContent}`,
            data: {
                fileContent: fileContent 
            },
            ui: new CardUIBuilder()
                .title("Project Tasks")
                // .content(tasks.map((task, index) => `${index + 1}. ${task}`).join('\n'))
                .content(`Read ${fileName}, ${fileContent.split("\n").length} lines`)
                .build()
        }
    },
};


export const writeFile: ToolConfig = {
    id: "write-file", 
    name: "Write File",
    description: "Writes content to a file at the specified path",
    input: z
        .object({
            fileName: z.string().describe("The file path"),
            content: z.string().describe("Content to write to the file")
        })
        .describe("Input parameters to write content to a file"),
    output: z
        .object({
            success: z.boolean().describe("Whether the write was successful"),
            bytesWritten: z.number().describe("Number of bytes written")
        })
        .describe("Result of writing to the file"),
    pricing: { pricePerUse: 0, currency: "USD" },
    handler: async (
        { fileName, content },
        agentInfo,
        context
    ) => {
        try {
            // Create directories if they don't exist
            const dir = path.dirname(fileName);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // Write file contents
            fs.writeFileSync(fileName, content, 'utf8');
            const numLines = content.split('\n').length;
            return {
                text: `Successfully wrote ${numLines} lines to ${fileName}`,
                data: {
                    success: true,
                    linesWritten: numLines
                },
                ui: new CardUIBuilder()
                    .title("File Written")
                    .content(`Wrote ${numLines} lines to ${fileName}`)
                    .build()
            }
        } catch (error: any) {
            return {
                text: `Failed to write to ${fileName}: ${error.message}`,
                data: {
                    success: false,
                    linesWritten: 0
                },
                ui: new CardUIBuilder()
                    .title("File Write Failed") 
                    .content(`Error: ${error.message}`)
                    .build()
            }
        }
    },
};