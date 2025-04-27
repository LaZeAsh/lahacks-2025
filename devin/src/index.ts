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

const port = Number(process.env.PORT) || 2022;

const dainService = defineDAINService({
  metadata: {
    title: "Weather DAIN Service",
    description:
      "A DAIN service for current weather and forecasts using Open-Meteo API",
    version: "1.0.0",
    author: "Your Name",
    tags: ["weather", "forecast", "dain"],
    logo: "https://cdn-icons-png.flaticon.com/512/252/252035.png",
  },
  exampleQueries: [
    {
      category: "Weather",
      queries: [
        "What is the weather in Tokyo?",
        "What is the weather in San Francisco?",
        "What is the weather in London?",
      ],
    },
  ],
  identity: {
    apiKey: process.env.DAIN_API_KEY,
  },
  tools: [],
});

dainService.startNode({ port: port }).then(({ address }) => {
  console.log("Weather DAIN Service is running at :" + address().port);
});
