import os
import datetime
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet

import models

def generate_pdf_report(db: Session, output_path: str):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc = SimpleDocTemplate(output_path, pagesize=letter)
    styles = getSampleStyleSheet()
    title_style = styles['Heading1']
    subtitle_style = styles['Heading2']
    normal_style = styles['Normal']
    
    story = []
    
    # Title
    story.append(Paragraph("Noryx Compliance &amp; Risk Report", title_style))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph(f"Generated on: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", normal_style))
    story.append(Spacer(1, 12))
    
    # Overall Compliance Stats
    evidences = db.query(models.Evidence).all()
    total = len(evidences)
    passed = sum(1 for e in evidences if e.status and e.status.lower() == "pass")
    failed = sum(1 for e in evidences if e.status and e.status.lower() == "fail")
    
    compliance_pct = round((passed / total * 100) if total > 0 else 0, 1)
    
    story.append(Paragraph("Overall Compliance Metrics", subtitle_style))
    
    data = [
        ["Total Evidence Evaluated", str(total)],
        ["Passed", str(passed)],
        ["Failed", str(failed)],
        ["Overall Compliance", f"{compliance_pct}%"]
    ]
    
    t = Table(data, colWidths=[200, 100])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
    ]))
    
    story.append(t)
    story.append(Spacer(1, 24))
    
    # Open Risks
    story.append(Paragraph("Open Risks Summary", subtitle_style))
    open_risks = db.query(models.Risk).filter(models.Risk.status == "Open").all()
    
    if open_risks:
        risk_data = [["Title", "Impact", "Likelihood", "Control ID"]]
        for r in open_risks:
            risk_data.append([r.title, r.impact, r.likelihood, str(r.control_id)])
            
        rt = Table(risk_data, colWidths=[200, 80, 80, 80])
        rt.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightsalmon),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        story.append(rt)
    else:
        story.append(Paragraph("No open risks identified.", normal_style))
        
    story.append(Spacer(1, 24))
    
    # Tasks Overview
    story.append(Paragraph("Pending Tasks", subtitle_style))
    pending_tasks = db.query(models.Task).filter(models.Task.status == "Pending").all()
    
    if pending_tasks:
        task_data = [["Task", "Due Date", "Dept ID"]]
        for t in pending_tasks:
            due = t.due_date.strftime('%Y-%m-%d') if t.due_date else "N/A"
            task_data.append([t.title, due, str(t.department_id)])
            
        tt = Table(task_data, colWidths=[250, 100, 80])
        tt.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightblue),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        story.append(tt)
    else:
        story.append(Paragraph("No pending tasks.", normal_style))

    doc.build(story)
    return output_path
