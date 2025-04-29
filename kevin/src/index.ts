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

const port = Number(process.env.PORT) || 2023;

// Import tools

import { newGHProject, newGHIssue } from "./gh";
import { validateIdea } from "./idea";

const dainService = defineDAINService({
  metadata: {
    title: "Devin, AI Product Manager",
    description:
      "A DAIN service to be an AI Product Manager",
    version: "1.0.0",
    author: "Ayush (LaZeAsh)",
    tags: ["AI", "Product", "Manager"],
    logo: "https://cdn-icons-png.flaticon.com/512/252/252035.png",
  },
  exampleQueries: [
    {
      category: "Projects",
      queries: [
        "Plan out a project to build a personal website",
        "Plan out an API in python",
        "Plan out a notetaking app",
      ],
    },
  ],
  identity: {
    apiKey: process.env.DAIN_API_KEY,
  },
  tools: [newGHProject, newGHIssue, validateIdea],
});

dainService.startNode({ port: port }).then(({ address }) => {
  console.log("Weather DAIN Service is running at :" + address().port);
});
