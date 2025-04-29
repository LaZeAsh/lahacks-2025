// Manages GitHub operations for Devin Software Engineer

import { z } from "zod";
import axios from "axios";
import fs from 'fs';
import path from "path";

import { defineDAINService, ToolConfig } from "@dainprotocol/service-sdk";

import {
    CardUIBuilder,
    TableUIBuilder,
    MapUIBuilder,
    LayoutUIBuilder,
} from "@dainprotocol/utils";

export const readGitRepo: ToolConfig = {
    id: "read-git-repo",
    name: "Read Git Repository",
    description: "Reads the content of files from a GitHub repository",
    input: z
        .object({
            repoURL: z.string().describe("The GitHub repository URL (format: https://github.com/owner/repo)"),
            path: z.string().optional().describe("Specific path within the repository to read (optional)")
        })
        .describe("Input parameters to read repository contents"),
    output: z
        .object({
            files: z.array(z.object({
                path: z.string().describe("File path"),
                content: z.string().describe("File content"),
                sha: z.string().describe("File SHA")
            }))
        })
        .describe("The repository contents"),
    pricing: { pricePerUse: 0, currency: "USD" },
    handler: async (
        { repoURL, path: filePath },
        agentInfo,
        context
    ) => {
        const urlParts = repoURL.replace("https://github.com/", "").split("/");
        const owner = urlParts[0];
        const repo = urlParts[1];

        try {
            // Get repository contents
            const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath || ''}`;
            const response = await axios.get(apiUrl, {
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    ...(process.env.GITHUB_TOKEN && {
                        'Authorization': `token ${process.env.GITHUB_TOKEN}`
                    })
                }
            });

            const files = Array.isArray(response.data) ? response.data : [response.data];
            const fileContents = await Promise.all(
                files
                    .filter((file: any) => file.type === 'file')
                    .map(async (file: any) => {
                        // For large files, GitHub API doesn't include content directly
                        // We need to fetch it separately
                        let content = file.content;
                        if (!content && file.download_url) {
                            const contentResponse = await axios.get(file.download_url);
                            content = Buffer.from(contentResponse.data).toString('base64');
                        }
                        
                        return {
                            path: file.path,
                            content: content ? Buffer.from(content, 'base64').toString('utf-8') : '',
                            sha: file.sha
                        };
                    })
            );

            return {
                text: `Read ${fileContents.length} files from repository`,
                data: {
                    files: fileContents
                },
                ui: new CardUIBuilder()
                    .title("Repository Contents")
                    .content(
                        fileContents.length > 0 
                            ? fileContents.map((file: any) => 
                                `${file.path} (${file.content.split('\n').length} lines)`
                              ).join('\n')
                            : 'No files found in specified path'
                    )
                    .build()
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message;
            throw new Error(`Failed to read repository contents: ${errorMessage}`);
        }
    },
};

export const pushToGitRepo: ToolConfig = {
    id: "push-to-git-repo",
    name: "Push to Git Repository",
    description: "Pushes file changes to a GitHub repository",
    input: z
        .object({
            repoURL: z.string().describe("The GitHub repository URL (format: https://github.com/owner/repo)"),
            files: z.array(z.object({
                path: z.string().describe("File path in the repository"),
                content: z.string().describe("New file content"),
                message: z.string().describe("Commit message for this file change")
            }))
        })
        .describe("Input parameters to push changes to repository"),
    output: z
        .object({
            commits: z.array(z.object({
                sha: z.string().describe("Commit SHA"),
                url: z.string().describe("Commit URL")
            }))
        })
        .describe("The created commits"),
    pricing: { pricePerUse: 0, currency: "USD" },
    handler: async (
        { repoURL, files },
        agentInfo,
        context
    ) => {
        if (!process.env.GITHUB_TOKEN) {
            throw new Error("GitHub token is required for pushing changes");
        }

        const urlParts = repoURL.replace("https://github.com/", "").split("/");
        const owner = urlParts[0];
        const repo = urlParts[1];

        try {
            const commits = [];

            for (const file of files) {
                // First get the current file (if it exists) to get its SHA
                let currentFileSHA;
                try {
                    const fileResponse = await axios.get(
                        `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`,
                        {
                            headers: {
                                'Accept': 'application/vnd.github.v3+json',
                                'Authorization': `token ${process.env.GITHUB_TOKEN}`
                            }
                        }
                    );
                    currentFileSHA = fileResponse.data.sha;
                } catch (error: any) {
                
                }

                // Push the change
                const response = await axios.put(
                    `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`,
                    {
                        message: file.message,
                        content: Buffer.from(file.content).toString('base64'),
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
                text: `Successfully pushed ${files.length} files to repository`,
                data: {
                    commits
                },
                ui: new CardUIBuilder()
                    .title("Push Results")
                    .content(commits.map((commit: any, index: number) => 
                        `${index + 1}. ${files[index].path} - Commit ${commit.sha.substring(0, 7)}`
                    ).join('\n'))
                    .build()
            }
        } catch (error: any) {
            throw new Error(`Failed to push changes: ${error.message}`);
        }
    },
};

export const getGithubIssues: ToolConfig = {
    id: "get-github-issues",
    name: "Get GitHub Issues",
    description: "Extracts all issues from a given GitHub repository",
    input: z
        .object({
            repoURL: z.string().describe("The GitHub repository URL (format: https://github.com/owner/repo)")
        })
        .describe("Input parameters to fetch GitHub issues"),
    output: z
        .object({
            issues: z.array(z.object({
                number: z.number().describe("Issue number"),
                title: z.string().describe("Issue title"),
                body: z.string().describe("Issue description"),
                state: z.string().describe("Issue state (open/closed)"),
                created_at: z.string().describe("Issue creation date"),
                html_url: z.string().describe("Issue URL")
            })).describe("List of issues from the repository")
        })
        .describe("The extracted GitHub issues"),
    pricing: { pricePerUse: 0, currency: "USD" },
    handler: async (
        { repoURL },
        agentInfo,
        context
    ) => {
        // Extract owner and repo from URL
        const urlParts = repoURL.replace("https://github.com/", "").split("/");
        const owner = urlParts[0];
        const repo = urlParts[1];

        // GitHub API endpoint
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/issues`;
        
        try {
            const response = await axios.get(apiUrl, {
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    ...(process.env.GITHUB_TOKEN && {
                        'Authorization': `token ${process.env.GITHUB_TOKEN}`
                    })
                }
            });

            const issues = response.data.map((issue: any) => ({
                number: issue.number,
                title: issue.title,
                body: issue.body || "",
                state: issue.state,
                created_at: issue.created_at,
                html_url: issue.html_url
            }));

            return {
                text: `Found ${issues.length} issues in repository ${owner}/${repo}`,
                data: {
                    issues
                },
                ui: new CardUIBuilder()
                    .title("GitHub Issues")
                    .content(
                        issues.map((issue: any) => 
                            `#${issue.number} - ${issue.title}\nState: ${issue.state}\nCreated: ${new Date(issue.created_at).toLocaleDateString()}\n`
                        ).join('\n')
                    )
                    .build()
            }
        } catch (error: any) {
            throw new Error(`Failed to fetch GitHub issues: ${error.message}`);
        }
    },
};

export const closeGithubIssue: ToolConfig = {
    id: "close-github-issue",
    name: "Close GitHub Issue",
    description: "Closes a GitHub issue and optionally adds a closing comment",
    input: z
        .object({
            repoURL: z.string().describe("The GitHub repository URL (format: https://github.com/owner/repo)"),
            issueNumber: z.number().describe("The issue number to close"),
            comment: z.string().optional().describe("Optional comment to add before closing the issue")
        })
        .describe("Input parameters to close a GitHub issue"),
    output: z
        .object({
            closed: z.boolean().describe("Whether the issue was successfully closed"),
            commentAdded: z.boolean().describe("Whether a comment was added")
        })
        .describe("The result of closing the issue"),
    pricing: { pricePerUse: 0, currency: "USD" },
    handler: async (
        { repoURL, issueNumber, comment },
        agentInfo,
        context
    ) => {
        if (!process.env.GITHUB_TOKEN) {
            throw new Error("GITHUB_TOKEN environment variable is required for GitHub operations");
        }

        const urlParts = repoURL.replace("https://github.com/", "").split("/");
        const owner = urlParts[0];
        const repo = urlParts[1];

        try {
            // Add comment if provided
            let commentAdded = false;
            if (comment) {
                await axios.post(
                    `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
                    {
                        body: comment
                    },
                    {
                        headers: {
                            'Accept': 'application/vnd.github.v3+json',
                            'Authorization': `token ${process.env.GITHUB_TOKEN}`
                        }
                    }
                );
                commentAdded = true;
            }

            // Close the issue
            await axios.patch(
                `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`,
                {
                    state: 'closed'
                },
                {
                    headers: {
                        'Accept': 'application/vnd.github.v3+json',
                        'Authorization': `token ${process.env.GITHUB_TOKEN}`
                    }
                }
            );

            return {
                text: `Successfully closed issue #${issueNumber}${commentAdded ? ' with comment' : ''}`,
                data: {
                    closed: true,
                    commentAdded
                },
                ui: new CardUIBuilder()
                    .title("Issue Closed")
                    .content(
                        `Issue #${issueNumber} has been closed\n` +
                        (commentAdded ? `Comment added: ${comment}` : 'No closing comment added')
                    )
                    .build()
            }
        } catch (error: any) {
            throw new Error(`Failed to close issue: ${error.message}`);
        }
    },
};
