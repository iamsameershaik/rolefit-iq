# RoleFit IQ Test Dataset

This directory contains the synthetic evaluation dataset used to validate and demonstrate RoleFit IQ.

The documents are intentionally fictional and are designed to provide deterministic test cases for role-fit analysis, retrieval quality, grounded chat, and recommendation workflows.

## Dataset

### CVs

- `CV_01_AI_Engineer_Sample.txt`
- `CV_02_Data_Analyst_Sample.txt`

### Job Descriptions

#### AI Engineering

- `JD_01_AI_Engineer_RAG_Platform.txt`
- `JD_02_AI_Engineer_Automation.txt`
- `JD_03_AI_Engineer_Product.txt`

#### Data Analytics

- `JD_04_Data_Analyst_Product_Analytics.txt`
- `JD_05_Data_Analyst_Operations_BI.txt`

---

## Recommended Test Scenarios

### Test A — Strong AI Engineer Match

**CV**

- `CV_01_AI_Engineer_Sample.txt`

**Job Descriptions**

- `JD_01_AI_Engineer_RAG_Platform.txt`
- `JD_02_AI_Engineer_Automation.txt`
- `JD_03_AI_Engineer_Product.txt`

**Expected outcome**

- Strong to moderate role fit
- Strong evidence for Python, React, TypeScript, RAG, and LLM engineering
- Minor gaps around enterprise-scale deployment and AWS Bedrock experience

---

### Test B — Strong Data Analyst Match

**CV**

- `CV_02_Data_Analyst_Sample.txt`

**Job Descriptions**

- `JD_04_Data_Analyst_Product_Analytics.txt`
- `JD_05_Data_Analyst_Operations_BI.txt`

**Expected outcome**

- Strong data analyst fit
- Strong SQL, BI, dashboard, and reporting evidence
- Limited evidence for AI engineering capabilities

---

### Test C — Cross-Domain Mismatch

**CV**

- `CV_02_Data_Analyst_Sample.txt`

**Job Descriptions**

- `JD_01_AI_Engineer_RAG_Platform.txt`
- `JD_02_AI_Engineer_Automation.txt`
- `JD_03_AI_Engineer_Product.txt`

**Expected outcome**

- Lower AI Engineer fit
- Skill-gap recommendations around LLM systems, RAG, embeddings, prompt engineering, and production AI applications

---

### Test D — AI Engineer Against Data Analyst Roles

**CV**

- `CV_01_AI_Engineer_Sample.txt`

**Job Descriptions**

- `JD_04_Data_Analyst_Product_Analytics.txt`
- `JD_05_Data_Analyst_Operations_BI.txt`

**Expected outcome**

- Some transferable evidence for SQL and data analysis
- Weaker fit for BI reporting, dashboard development, and operational analytics

---

## Validation Coverage

This dataset can be used to validate:

- Document upload and paste workflows
- Document validation and parsing
- Chunking and embedding quality
- Multi-document retrieval
- Role-fit analysis
- Single and multi-job comparison
- Grounded assistant responses with citations
- CV rewrite recommendations
- Risk flags and "Do Not Claim" guidance
- Demo mode and regression testing