// Manages file system for Devin Software Engineer

import { z } from "zod";
import axios from "axios";
import Groq from 'groq-sdk';
import fs from 'fs';
import path from "path";
import { exec } from "child_process";

import { defineDAINService, ToolConfig } from "@dainprotocol/service-sdk";

import {
    CardUIBuilder,
    TableUIBuilder,
    MapUIBuilder,
    LayoutUIBuilder,
} from "@dainprotocol/utils";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const setupRepo: ToolConfig = {
    id: "setup-repo",
    name: "Setup Repo",
    description: "Given the Repository URL it clones and cd's into the repo",
    input: z
        .object({
            repoURL: z.string().describe("The repository URL")
        })
        .describe("Input parameters to read the contents of the file"),
    output: z
        .object({
            status: z.boolean().describe("Status of setup")
        })
        .describe("Setup the repository before any coding work can be done"),
    pricing: { pricePerUse: 0, currency: "USD" },
    handler: async (
        { repoURL },
        agentInfo,
        context
    ) => {


        exec(`../scripts/node.sh ${repoURL}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing script: ${error}`);
                return;
            }
            console.log(`Script output: ${stdout}`);
            if (stderr) {
                console.error(`Script errors: ${stderr}`);
            }
        });

        return {
            text: `Successfully cloned ${repoURL} and cd'd into it`,
            data: {
                status: true
            },
            ui: new CardUIBuilder()
                .title("Repository Setup")
                .content(`Successfully cloned repository at ${repoURL}\nReady for development!`)
                .build()
        }
    },
};