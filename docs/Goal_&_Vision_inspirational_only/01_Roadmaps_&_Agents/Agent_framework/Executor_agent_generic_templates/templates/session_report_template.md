# **Session Report: {{SESSION\_ID}}**

* **Objective**: {{OBJECTIVE\_TITLE}}  
* **Slice**: {{SLICE\_TITLE}}  
* **Status**: SUCCESS | PARTIAL | BLOCKED  
* **Span Root**: {{SPAN\_ROOT}}  
* **Start**: {{START\_ISO}}  
* **End**: {{END\_ISO}}

## **Micro-Plan**

* **Files**:  
* **Tests/Checks**:  
* **Risks**:  
* **Acceptance**:

## **Changes**

{{DIFF\_SNIPPET}}

## **Evidence Block**

* **FINDING**: {{FINDING}}  
* **COMPONENT**: {{COMPONENT}}  
* **EVIDENCE**:  
  * {{FILE}}:{{START\_LINE}}-{{END\_LINE}} \[description of change\]  
  * *log/test excerpt with timestamp or span\_id*  
* **IMPACT**: {{IMPACT}}  
* **CRITICALITY**: LOW | MEDIUM | HIGH  
* **QUALITY GATES**: lint/build/tests  
* **SECURITY/COMPLIANCE**: {{SSDF\_ASVS\_MAPPING}}

## **Results**

* **Lint**: {{LINT\_STATUS}}  
* **Build/Typecheck**: {{BUILD\_STATUS}}  
* **Tests**: {{TEST\_STATUS}}  
* **Validation**: {{VALIDATION\_STATUS}}

## **Next Action**

* {{NEXT\_ACTION}}