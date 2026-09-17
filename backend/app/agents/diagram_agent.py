from typing import Dict

class DiagramAgent:
    """
    Generates and validates Mermaid.js diagrams for academic lecture notes.
    """
    
    TEMPLATES: Dict[str, str] = {
        "tcp_congestion": """graph TD
    A[Slow Start Phase<br/>Exponential Increase: cwnd doubles every RTT] -->|cwnd >= ssthresh| B[Congestion Avoidance Phase<br/>Additive Increase: cwnd += 1 MSS / RTT]
    B -->|Timeout Detected| C[Severe Congestion Event<br/>ssthresh = cwnd / 2<br/>cwnd = 1 MSS]
    C --> A
    B -->|3 Duplicate ACKs| D[Fast Retransmit & Fast Recovery<br/>ssthresh = cwnd / 2<br/>cwnd = ssthresh + 3 MSS]
    D -->|New ACK Received| B""",

        "dbms_normalization": """graph LR
    UNF[Unnormalized Form<br/>Contains repeating groups] -->|Remove repeating groups| 1NF[1st Normal Form 1NF<br/>Atomic attribute values]
    1NF -->|Remove Partial Dependencies| 2NF[2nd Normal Form 2NF<br/>All non-key attributes fully dependent on PK]
    2NF -->|Remove Transitive Dependencies| 3NF[3rd Normal Form 3NF<br/>No non-key attribute depends on non-key]
    3NF -->|Determinant must be Super Key| BCNF[Boyce-Codd Normal Form BCNF<br/>Strict functional dependency]""",

        "osi_model": """graph TD
    subgraph Host Layers
        L7[7. Application Layer: HTTP, DNS, SMTP]
        L6[6. Presentation Layer: SSL/TLS, JPEG, ASCII]
        L5[5. Session Layer: RPC, NetBIOS]
        L4[4. Transport Layer: TCP, UDP - Port Addressing]
    end
    subgraph Media Layers
        L3[3. Network Layer: IP, ICMP, Routing - Packets]
        L2[2. Data Link Layer: Ethernet, MAC, Framing - Frames]
        L1[1. Physical Layer: Cables, Signals, Bits - Bits]
    end
    L7 --> L6 --> L5 --> L4 --> L3 --> L2 --> L1""",

        "ml_pipeline": """graph LR
    A[Raw Dataset] --> B[Data Preprocessing & Cleaning]
    B --> C[Feature Engineering & Selection]
    C --> D[Train-Test Split 80/20]
    D --> E[Model Training / Optimization]
    E --> F[Validation & Cross-Validation]
    F -->|Satisfies Metric| G[Deployment & Monitoring]
    F -->|Overfitting/Underfitting| E""",

        "generic_flowchart": """graph TD
    Start([Start]) --> Input[/Read Academic Input/]
    Input --> Process[Execute Core Algorithm Steps]
    Process --> Condition{Is Condition Satisfied?}
    Condition -- Yes --> Result[Generate Verified Output]
    Condition -- No --> Adjust[Adjust Parameters & Retry]
    Adjust --> Process
    Result --> End([End Process])"""
    }

    @classmethod
    def generate_diagram(cls, topic: str) -> str:
        topic_lower = topic.lower()
        if "tcp" in topic_lower or "congestion" in topic_lower or "transport" in topic_lower:
            return cls.TEMPLATES["tcp_congestion"]
        elif "normal" in topic_lower or "dbms" in topic_lower or "database" in topic_lower or "functional" in topic_lower:
            return cls.TEMPLATES["dbms_normalization"]
        elif "osi" in topic_lower or "network" in topic_lower or "layer" in topic_lower:
            return cls.TEMPLATES["osi_model"]
        elif "machine learning" in topic_lower or "neural" in topic_lower or "model" in topic_lower or "supervised" in topic_lower:
            return cls.TEMPLATES["ml_pipeline"]
        else:
            return cls.TEMPLATES["generic_flowchart"]
