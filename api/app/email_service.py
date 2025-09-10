import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import os
from datetime import datetime

class EmailService:
    def __init__(self):
        self.smtp_server = os.getenv("SMTP_SERVER", "localhost")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("FROM_EMAIL", "noreply@crowdlunch.com")
        
    def send_email(self, to_email: str, subject: str, body: str, is_html: bool = False) -> bool:
        """Send email using SMTP"""
        try:
            msg = MIMEMultipart()
            msg['From'] = self.from_email
            msg['To'] = to_email
            msg['Subject'] = subject
            
            msg.attach(MIMEText(body, 'html' if is_html else 'plain', 'utf-8'))
            
            if self.smtp_username and self.smtp_password:
                server = smtplib.SMTP(self.smtp_server, self.smtp_port)
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
                server.quit()
                return True
            else:
                print(f"[EMAIL MOCK] Would send email to {to_email}: {subject}")
                print(f"[EMAIL MOCK] Body: {body[:100]}...")
                return True
                
        except Exception as e:
            print(f"Failed to send email: {e}")
            return False
    
    def send_order_confirmation(self, to_email: str, order_id: int, customer_name: str, 
                              items: list, total_amount: int, pickup_time: str) -> bool:
        """Send order confirmation email"""
        subject = f"【CROWD LUNCH】ご注文確認 (注文番号: {order_id})"
        
        items_text = "\n".join([f"・{item['name']} × {item['qty']} = ¥{item['price'] * item['qty']:,}" 
                               for item in items])
        
        body = f"""
{customer_name} 様

この度は、CROWD LUNCHをご利用いただき、誠にありがとうございます。
ご注文を承りましたので、詳細をお知らせいたします。

【注文詳細】
注文番号: {order_id}
お受け取り時間: {pickup_time}

【ご注文内容】
{items_text}

合計金額: ¥{total_amount:,}（税込）

【お受け取りについて】
指定されたお時間に、指定場所までお届けいたします。
お受け取り時間の変更やキャンセルをご希望の場合は、
お受け取り予定時刻の30分前までにご連絡ください。

何かご不明な点がございましたら、お気軽にお問い合わせください。

今後ともCROWD LUNCHをよろしくお願いいたします。

---
CROWD LUNCH
お問い合わせ: info@crowdlunch.com
"""
        
        return self.send_email(to_email, subject, body)
    
    def send_pickup_reminder(self, to_email: str, order_id: int, customer_name: str, 
                           pickup_time: str) -> bool:
        """Send pickup reminder email"""
        subject = f"【CROWD LUNCH】お受け取り時間のお知らせ (注文番号: {order_id})"
        
        body = f"""
{customer_name} 様

CROWD LUNCHをご利用いただき、ありがとうございます。

お受け取り時間が近づいてまいりましたので、お知らせいたします。

【注文番号】{order_id}
【お受け取り時間】{pickup_time}

指定場所にてお待ちしております。

---
CROWD LUNCH
"""
        
        return self.send_email(to_email, subject, body)

email_service = EmailService()
