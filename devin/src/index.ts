//File: example/example-node.ts

import { z } from "zod";
import axios from "axios";

import { defineDAINService, ToolConfig } from "@dainprotocol/service-sdk";

import {
  CardUIBuilder,
  TableUIBuilder,
  MapUIBuilder,
  LayoutUIBuilder,
} from "@dainprotocol/utils";

import { writeCode } from "./code";
import { readGitRepo, pushToGitRepo, getGithubIssues, closeGithubIssue } from "./gh";
// import { readFile, writeFile } from "./files";
// import { setupRepo } from "./setup";

const port = Number(process.env.PORT) || 2022;



const dainService = defineDAINService({
  metadata: {
    title: "Devin, AI Software Engineer",
    description:
      "A DAIN service to be an AI Software Engineer",
    version: "1.0.0",
    author: "Ayush",
    tags: ["AI", "Software", "Engineer"],
    logo: "https://cdn-icons-png.flaticon.com/512/252/252035.png",
  },
  exampleQueries: [
    {
      category: "Software",
      queries: [
        "Solve all of the github issues in this repository"
      ],
    },
  ],
  identity: {
    apiKey: process.env.DAIN_API_KEY,
  },
  tools: [writeCode, getGithubIssues, readGitRepo, pushToGitRepo, closeGithubIssue],
});

dainService.startNode({ port: port }).then(({ address }) => {
  console.log("Weather DAIN Service is running at :" + address().port);
});
