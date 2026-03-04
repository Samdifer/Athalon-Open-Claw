
 please review this prompt and initial instruction set for creating this system. I want you to be creative and partner with me in creating this application. Tell me what information you need to be successful in light of my requirements and analyzing this entire repo 
# Repair Station System Document Review and Reporting Prompt (Revised)

I am creating a system that will help me review repair station documents accurately and produce a report that documents the successes and deficiencies of the repair station documents as they are provided.

## Goal of the application
The goal of this application is to use all resources within the application, as well as external sources, to evaluate the current status of our repair station documents as if you were an FAA Primary Maintenance Inspector assigned to that repair station.

## Evaluation method
During this task, you will evaluate the repair station system documents using the FAA Data Collection Tool (DCT). Specific Data Collection Tool items are found in FAA Order 8900.1.

For every finding, you will do the following:

1. Record the status of the item as it relates to the specific repair station document being evaluated.
2. Score the item using the DCT finding criteria.
3. After determining the finding and its level of satisfactoriness or acceptability, you will act as the Accountable Manager for that repair station and determine the applicable actions below.

## Accountable Manager actions by finding type

* If the finding is **satisfactory**, determine what best practices can be implemented from Advisory Circulars to improve the system.
* If the finding is **unsatisfactory**, and the DCT item is **optional**, determine what best practices can be implemented from Advisory Circulars to improve the system.
* If the finding is **unsatisfactory**, and the item is **required**, determine the minimal required action to become compliant per the DCT and Part 145 requirements (14 CFR Part 145) or other applicable 14 CFR requirements.
* For required items, also present the recommended best practice beyond the minimal requirements, using references from Advisory Circulars.

## Report requirements
All findings recorded in the report will be clearly classified per the DCT classification system and will indicate:

* whether the item is satisfactory or unsatisfactory
* whether the item is optional or required per Part 145 or other FAA regulatory requirements

The final report will be created as a Markdown file (.md) that follows the DCT format as presented by the FAA. It will include the compiled findings, recommendations, and required actions, written in sequential order, and intended to serve as the basis for a PDF or Word document to be transmitted later to the actual Accountable Manager.

---

## Core Reference Hierarchy and Data Types

We are defining the key reference sources and their roles in the system to guide research, enforce hierarchy, and support evaluation, planning, and solution generation.

### 1. Title 14 Code of Federal Regulations (14 CFR)
The most important component is Title 14 of the Code of Federal Regulations (14 CFR), the Aeronautics regulations of the United States. These are the primary requirements for aviation. This system will focus on 14 CFR Part 145, which governs repair stations.

In practice, “14 CFR” and “FARs” are often used interchangeably in conversation. The official term is “14 CFR Part 145.” If someone says “FAR 145,” it can be treated as meaning the same thing. These requirements supersede interpretations from other sources. However, they often require additional context for practical application, which is why this system also uses the supporting sources below.

### 2. FAA Order 8900.1
The second most important data source is FAA Order 8900.1. This is a primary source used by the FAA to evaluate real world application of the requirements found in Part 145 (14 CFR Part 145).

Although FAA Order 8900.1 covers a broad scope, we are primarily focused on Part 145 requirements. An index to the individual orders is provided in a spreadsheet, and you may use it. We also provide an index to navigate or look online for additional context for Order 8900.1.

#### The Data Collection Tool (DCT)
Contained within FAA Order 8900.1 is the Data Collection Tool (DCT), a formatted evaluation tool used by the FAA for various system components. In our case, it will be used to evaluate a Part 145 repair station’s documents, policies, and procedures.

FAA Order 8900.1 includes both mandatory regulatory guidance and optional guidance and best practices. Not all DCT items necessarily represent minimum regulatory requirements under 14 CFR Part 145. If an optional DCT item is found unsatisfactory, it may not require implementation for minimum compliance, but it should be flagged as a recommended best practice. In those cases, you should look to Advisory Circulars for implementation guidance.

For items that are mandatory, the DCT serves as an additional layer of interpretation that provides context to 14 CFR Part 145 and must be satisfied to a minimum level for compliance.

### 3. Advisory Circulars (AC)
The third data type is the Advisory Circular (AC). Advisory Circulars are FAA produced and non regulatory in nature. They contain best practice information and describe acceptable methods, but they are not, by themselves, regulatory requirements. When Advisory Circulars reference specific regulatory requirements, those referenced regulations remain the authority. Otherwise, the guidance should be treated as optional best practice.

### 4. Repair station documents and FAA SAS related records
The fourth data type is the repair station’s internal document set. These documents may take many forms, but commonly include:

* Repair Station Manual (RSM)
* Quality Control Manual (QCM)
* Training Manual
* Supplementary forms manual, or integrated forms within the manuals

These documents have different FAA statuses. The Repair Station Manual and Quality Control Manual are accepted documents that must be submitted to the FAA and, once accepted, may typically be changed through a defined notification process. The training manual is an approved document that must go through an approval process before implementation. Some repair stations combine manuals, while others separate them.

In addition, there are FAA SAS (Safety Assurance System) related governing records (for example operational specifications, authorized personnel, work away from station approvals, and others) that also define requirements and privileges. These generally reflect the same core content as the Repair Station Manual, Quality Control Manual, and Training Manual.

---

## Agent and Skill Architecture to Build

In this program, I want you to intelligently review the information above and create agents and skills that allow research, review, implementation suggestions, and reference handling to be performed adequately and independently by individual agents that can call specific skills in the agentic folder. I want you to follow Claude Code agent creation best practices and the documentation for creating agents.

### Research agent group
Create a researcher agent that includes multiple sub research agents:

* Advisory Circular researcher: understands AC structure, indexing, and citation format.
* FAA Order 8900.1 researcher: understands 8900.1 structure, indexing, and citation format.
* Federal Aviation Regulations researcher: a generalist for all FARs.
* 14 CFR Part 145 specialist: focused specifically on 14 CFR Part 145.

### Repair station document contextual agent
Create an agent familiar with repair station document systems, including typical components and how they are used and interpreted.

### FAA Primary Maintenance Inspector (PMI) audit agent
Create an agent that represents an FAA Primary Maintenance Inspector or auditor. This agent’s primary goal is to conduct DCT audits and detect deficiencies by using its research assistants in concert with the repair station documents and other sources to determine whether the documents meet the acceptance level for each DCT item.

This agent should follow the DCT guidance to understand the evaluation steps normally undertaken during a DCT evaluation, and it should produce contextual findings with proper references served by the research agents to explain the rationale for each finding. This agent should think step by step and in depth.

### Accountable Manager agent
Create an Accountable Manager agent. This agent will take the findings and context from the PMI agent and research agents and determine:

* the simplest corrective action to satisfy unsatisfactory findings
* best practices to improve satisfactory findings
* best practices to address optional items that are unsatisfactory
* the minimum compliance action for required items that are unsatisfactory
* recommended best practice beyond minimum compliance for required items, using FAA Order 8900.1 and Advisory Circular references

The Accountable Manager may orchestrate other agents to develop solutions, similar to how the PMI agent orchestrates research for evaluations.

---

## Required Skills

### Regulatory classification skill
A skill to evaluate whether something is regulatory and required, or best practice and optional. When classifications are determined, the system should update a file that captures learning and interpretation for future use, to shorten the memory cycle and avoid redoing work.

### Simplicity and cost evaluation skill
When proposing solutions, evaluate simplicity, cost, and impact on daily execution. The Evaluate Simplicity and Cost skill should help agents distinguish minimum requirements from best practice, and choose simpler defaults when appropriate, while still maintaining compliance.

### Reference and citation standardization skill
All research must include specific references. Each agent should understand reference requirements for Advisory Circulars, FAA Order 8900.1, Federal Aviation Regulations, and the repair station manual system. Build an index that enforces standardized references that work for both human review and AI retrieval.

### Combined indexing and search skill
A skill to search using a combined index of the information held in system files, plus the ability to add additional context discovered during research from external sources such as government sites. The system should organize this in a consistent file structure, preferring Markdown format where practical.

### Index navigation agent
Create a second agent skilled at navigating the internal index and file system to efficiently access sources, and to record relationships between sources as they are discovered.

---

## System behavior and persistence model
This system is essentially a self learning document neural net that records progress in Markdown files by updating, creating, and modifying files to capture relationships between source data and enable more efficient search and retrieval for all agents. It should preserve context in persistent storage in plain natural language, while also allowing code snippets where helpful for indexing and retrieval.

---

## RALPH Loop agent
Create a RALPH Loop agent that can initialize scopes of work, PRDs, and stories, then autonomously run the RALPH Loop to produce project outputs. When complete, it should guide storage into the overall contextual index, provide chunked outputs for the final research report, and update learning to improve efficiency, accuracy, error correction, debugging, and deployment consistency.

---

## Project initialization steps
This project is initialized inside a mostly empty file space except for source content and the RALPH Loop system.

First steps:

1. Set up the workspace and confirm the context of the existing RALPH Loop system.
2. Index the context files and source files.
3. Create a goals and instructions.md file using the initial instructions and additional context from this prompt.
4. Initiate the agent that creates composite indexing of source files and captures and indexes additional context as it is researched.
5. Create the agents described above.
6. Create the skills described above.
7. Provide overall scanning and understanding of the repair station system documents and ensure the system is fully functional.

This system should be self healing. If questions arise about outputs at the global or goal level, it should ask directional questions to a human in the loop.

---

## Primary constraint: accuracy
Most importantly, your goal is to evaluate the repair station system documents using the tools provided, acting as all parties normally involved in real life repair station evaluation, and provide recommendations for correcting repair station status for each finding.

Maintain a high level of accuracy and do not hallucinate or make things up if they do not exist.
