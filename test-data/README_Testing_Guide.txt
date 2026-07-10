RoleFit IQ Test Pack

This pack contains:
- 2 synthetic CVs
- 5 synthetic job descriptions

CVs:
1. CV_01_AI_Engineer_Sample.txt
2. CV_02_Data_Analyst_Sample.txt

AI Engineer JDs:
1. JD_01_AI_Engineer_RAG_Platform.txt
2. JD_02_AI_Engineer_Automation.txt
3. JD_03_AI_Engineer_Product.txt

Data Analyst JDs:
4. JD_04_Data_Analyst_Product_Analytics.txt
5. JD_05_Data_Analyst_Operations_BI.txt

Recommended smoke tests:

Test A — Strong AI match
- CV: CV_01_AI_Engineer_Sample.txt
- JDs: JD_01, JD_02, JD_03
Expected: strong/moderate AI fit, good evidence for RAG/React/Python/LLMs, gaps around AWS/Bedrock depth or enterprise scale.

Test B — Strong data analyst match
- CV: CV_02_Data_Analyst_Sample.txt
- JDs: JD_04, JD_05
Expected: strong data analyst fit, strong SQL/BI/dashboard evidence, weaker AI/RAG evidence.

Test C — Cross-domain mismatch
- CV: CV_02_Data_Analyst_Sample.txt
- JDs: JD_01, JD_02, JD_03
Expected: weaker AI engineer fit, gaps around LLM systems, RAG, embeddings, production AI apps.

Test D — AI CV against data analyst roles
- CV: CV_01_AI_Engineer_Sample.txt
- JDs: JD_04, JD_05
Expected: some SQL/dashboard/data overlap, but weaker BI/operations analytics match.

Use these to test:
- upload/paste flow
- chunking and embedding
- role fit analysis
- real vs demo mode
- one-JD flow
- three-JD flow
- assistant citations
- rewrite recommendations
- risk flags and do-not-claim warnings
