/*
Tool file - Collecting initial information for the project & asking follow-up questions if needed
*/

import { z } from "zod";
import axios from "axios";
import { exec } from 'child_process'

import { defineDAINService, ToolConfig } from "@dainprotocol/service-sdk";

import {
  CardUIBuilder,
  TableUIBuilder,
  MapUIBuilder,
  LayoutUIBuilder,
} from "@dainprotocol/utils";

export const newGHProject: ToolConfig = {
  id: "new-gh-project",
  name: "New Github Project",
  description: "Initialized a new Github Project",
  input: z
    .object({
      name: z.string().describe("Name of the project"),
      language: z.enum(["python", "typescript"]).describe("Language to initialize project in"),
    })
    .describe("Input parameters for the weather request"),
  output: z
    .object({
      gitUrl: z.string().describe("URL for the new github repository")
    })
    .describe("Repository URL for "),
  pricing: { pricePerUse: 0, currency: "USD" },
  handler: async (
    { name, language },
    agentInfo,
    context
  ) => {

    console.log(`Agent ${agentInfo.id} is making a new Github Repository`);

    // Github Integration

    const repo_data = {
      name: name,
      description: `${name}, Kevin hard at work`,
      private: true
    }

    const headers = {
      "Authorization": `Bearer ${process.env.GITHUB_TOKEN}`,
      "Accept": "application/vnd.github+json"
    }

    // Make a new repository
    const response = await axios.post("https://api.github.com/user/repos", repo_data, {
      headers: headers
    })

    console.log(`New repository generated: ${response.data.html_url}`);

    // // Execute the node.sh script with the repository URL as an argument
    // exec(`../scripts/node.sh ${response.data.html_url}`, (error, stdout, stderr) => {
    //   if (error) {
    //     console.error(`Error executing script: ${error}`);
    //     return;
    //   }
    //   console.log(`Script output: ${stdout}`);
    //   if (stderr) {
    //     console.error(`Script errors: ${stderr}`);
    //   }
    // });

    // Initialize the code (Make a dockerfile?)

    return {
      text: `Made a new repository ${response.data.html_url} and initialized a ${language} project`,
      data: {
        gitUrl: response.data.html_url
      },
      ui: new CardUIBuilder()
        .title("New GitHub Repository Created")
        .content(`Repository URL: ${response.data.html_url}\nLanguage: ${language}`)
        // .addButton({
        //   text: "View Repository",
        //   url: response.data.html_url
        // })
        .build()
    }
  },
};

export const newGHIssue: ToolConfig = {
  id: "new-gh-issue", 
  name: "New Github Issue",
  description: "Makes a new issue for a Github Project",
  input: z
    .object({
      repoUrl: z.string().describe("URL of the repository to create issues in"),
      title: z.string().describe("Title of the issue"),
      description: z.string().describe("Description of the issue"),
    })
    .describe("Input for making a new issue"),
  output: z
    .object({
      issueUrl: z.string().describe("URL of the created issue")
    })
    .describe("Created issue information"),
  pricing: { pricePerUse: 0, currency: "USD" },
  handler: async (
    { repoUrl, title, description },
    agentInfo,
    context
  ) => {
    console.log(`Agent ${agentInfo.id} is creating a new Github Issue`);

    // Extract owner and repo name from URL
    const urlParts = repoUrl.split('/');
    const owner = urlParts[urlParts.length - 2];
    const repo = urlParts[urlParts.length - 1];

    const issue_data = {
      title: title,
      body: description
    };

    const headers = {
      "Authorization": `Bearer ${process.env.GITHUB_TOKEN}`,
      "Accept": "application/vnd.github+json"
    };

    // Create new issue
    const response = await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/issues`,
      issue_data,
      { headers }
    );

    console.log(`New issue created: ${response.data.html_url}`);

    return {
      text: `Created new issue "${title}" at ${response.data.html_url}`,
      data: {
        issueUrl: response.data.html_url
      },
      ui: new CardUIBuilder()
        .title("New Issue Created")
        .content(`Issue Title: ${title}\nIssue URL: ${response.data.html_url}`)
        .build()
    };
  },
};
