from typing import List, Dict, Any

class AnswerKeyAgent:
    """
    Dedicated Answer Key & Evaluation Rubric Agent.
    Generates step-by-step mark allocations, expected formulas, diagrams,
    MCQ solution keys, fill-up target terms, and evaluation criteria for faculty evaluation.
    """

    @classmethod
    def generate_answer_key(
        cls,
        subject_code: str,
        subject_name: str,
        set_code: str,
        items: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        
        md_lines = [
            f"# {subject_code} — {subject_name}",
            f"## Official Evaluation Scheme & Answer Key — {set_code}",
            f"**Autonomous Examination Scheme** | **Faculty Evaluation Rubric**",
            "",
            "---",
            ""
        ]

        rubrics = []
        current_section = ""

        for item in items:
            section = item.get("section_name", "Part A")
            if section != current_section:
                current_section = section
                md_lines.extend([
                    f"### {current_section.upper()}",
                    ""
                ])

            q_num = item.get("question_number")
            sub_div = item.get("sub_division", "")
            q_label = f"Q{q_num}({sub_div})" if sub_div else f"Q{q_num}"
            q_text = item.get("question_text", "")
            marks = item.get("marks", 2)
            bloom = item.get("bloom_level", "Understand")
            q_type = item.get("question_type", "SHORT_ANSWER")
            correct_ans = item.get("correct_answer", "")
            explanation = item.get("explanation", "")
            options = item.get("options", [])

            md_lines.append(f"#### **{q_label}. {q_text}** `[{marks} Mark(s) | Type: {q_type} | Bloom: {bloom}]`")

            # Handle MCQs
            if q_type in ["MCQ", "MULTIPLE_CHOICE"] or options:
                step_breakdown = [
                    {"step": f"Selection of correct option ({correct_ans})", "marks": float(marks)}
                ]
                expected_ans = (
                    f"**Correct Option:** `{correct_ans}`\n\n"
                    f"**Pedagogical Rationale:** {explanation or 'Direct syllabus concept verification.'}\n"
                    f"- 100% credit ({marks} Mark) for choosing `{correct_ans}`."
                )
            # Handle Fill in Blanks
            elif q_type in ["FILL_IN_BLANKS", "FILL_UP"]:
                step_breakdown = [
                    {"step": f"Accurate keyword / technical term: '{correct_ans}'", "marks": float(marks)}
                ]
                expected_ans = (
                    f"**Expected Completion Term:** `{correct_ans}`\n\n"
                    f"**Concept Note:** {explanation or 'Target technical relation.'}\n"
                    f"- Full credit for exact or semantically equivalent standard technical term."
                )
            # Handle Numerical
            elif q_type in ["NUMERICAL", "COMPUTATIONAL"]:
                step_breakdown = [
                    {"step": "Formula identification & given parameter extraction", "marks": round(marks * 0.3, 1)},
                    {"step": "Intermediate calculation & substitution steps", "marks": round(marks * 0.4, 1)},
                    {"step": "Final numerical value with appropriate engineering units", "marks": round(marks * 0.3, 1)}
                ]
                expected_ans = (
                    f"**Numerical Solution Pipeline:**\n"
                    f"- **{step_breakdown[0]['marks']} Marks:** State governing equations and list given parameters.\n"
                    f"- **{step_breakdown[1]['marks']} Marks:** Substitution of values and mathematical simplification.\n"
                    f"- **{step_breakdown[2]['marks']} Marks:** Final numerical answer with correct units.\n"
                    f"**Model Calculation:** {correct_ans}"
                )
            # Handle Code Analysis
            elif q_type in ["CODE_ANALYSIS", "ALGORITHM"]:
                step_breakdown = [
                    {"step": "Correct complexity analysis (Time & Space)", "marks": round(marks * 0.4, 1)},
                    {"step": "Identification of bottleneck / concurrency error", "marks": round(marks * 0.3, 1)},
                    {"step": "Refactored algorithm / code correction", "marks": round(marks * 0.3, 1)}
                ]
                expected_ans = (
                    f"**Code Analysis & Evaluation Criteria:**\n"
                    f"- **{step_breakdown[0]['marks']} Marks:** Asymptotic complexity justification.\n"
                    f"- **{step_breakdown[1]['marks']} Marks:** Vulnerability/bottleneck diagnosis.\n"
                    f"- **{step_breakdown[2]['marks']} Marks:** Clean, optimized pseudocode/refactoring.\n"
                    f"**Expected Solution:** {correct_ans}"
                )
            # Handle 2-3 marks Short Answers
            elif marks <= 3:
                step_breakdown = [
                    {"step": "Accurate technical definition / core theorem", "marks": 1.0},
                    {"step": "Governing formula / parameter / brief example", "marks": float(marks - 1)}
                ]
                expected_ans = (
                    f"**Key Points for Evaluator:**\n"
                    f"- **1 Mark:** Precise definition or foundational statement.\n"
                    f"- **{marks - 1} Mark(s):** Governing relation, standard terminology, or neat schematic snippet.\n"
                    f"**Expected Model Concept:** {correct_ans or 'Accurate formulation of syllabus concept.'}"
                )
            # Handle 10-14 marks Long Answers
            elif marks <= 14:
                m1 = round(marks * 0.25, 1)
                m2 = round(marks * 0.35, 1)
                m3 = round(marks * 0.25, 1)
                m4 = round(marks - (m1 + m2 + m3), 1)
                step_breakdown = [
                    {"step": "Introduction, core principles & conceptual definition", "marks": m1},
                    {"step": "Detailed architecture / neat labeled schematic diagram", "marks": m2},
                    {"step": "Mathematical derivation / algorithm steps / protocol flow", "marks": m3},
                    {"step": "Practical application, trade-offs & advantages", "marks": m4}
                ]
                expected_ans = (
                    f"**Step-Marking Distribution ({marks} Marks):**\n"
                    f"- **{m1} Marks:** Clear introductory concept and theoretical basis.\n"
                    f"- **{m2} Marks:** Labeled schematic diagram / sequence flow.\n"
                    f"- **{m3} Marks:** Complete step-by-step derivation or protocol algorithm sequence.\n"
                    f"- **{m4} Marks:** Real-world applicability, advantages, and limitations.\n"
                    f"*Note:* Accept alternative valid industry RFC protocols or standard textbook derivations."
                )
            # Handle 15+ marks Case Study
            else:
                step_breakdown = [
                    {"step": "System requirement formulation & root cause analysis", "marks": 3.0},
                    {"step": "Architectural block diagram & protocol stack design", "marks": 6.0},
                    {"step": "Throughput / delay mathematical modeling & SLA proof", "marks": 4.0},
                    {"step": "Critical evaluation of security, failure recovery & scalability", "marks": 2.0}
                ]
                expected_ans = (
                    f"**Case Study Evaluation Criteria ({marks} Marks):**\n"
                    f"- **3.0 Marks:** Clear identification of constraints and system requirements.\n"
                    f"- **6.0 Marks:** Comprehensive architectural schematic design.\n"
                    f"- **4.0 Marks:** Mathematical delay/throughput computations and protocol parameter justification.\n"
                    f"- **2.0 Marks:** Critical failure mode analysis, security mitigation, and scalability trade-offs.\n"
                    f"**Expected Case Resolution:** {correct_ans}"
                )

            rubrics.append({
                "question_label": q_label,
                "question_text": q_text,
                "marks": marks,
                "step_breakdown": step_breakdown
            })

            md_lines.extend([
                expected_ans,
                "",
                "**Step Allocation:**",
                *[f"- *{s['step']}:* **{s['marks']} Mark(s)**" for s in step_breakdown],
                "",
                "---",
                ""
            ])

        final_markdown = "\n".join(md_lines)
        return {
            "title": f"Answer Key — {subject_code} ({set_code})",
            "set_code": set_code,
            "content_markdown": final_markdown,
            "marking_rubrics": rubrics
        }
