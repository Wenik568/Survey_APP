const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  async initializeTransporter() {
    try {
      // Конфігурація для тестування
      if (process.env.NODE_ENV === 'development' && !process.env.EMAIL_PASSWORD) {
        // Створюємо тестовий акаунт Ethereal
        const testAccount = await nodemailer.createTestAccount();

        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });

        console.log('📧 Using test email service (Ethereal)');
        console.log('📧 Test account:', testAccount.user);
      } else {
        // Конфігурація для різних email провайдерів
        const emailProvider = process.env.EMAIL_PROVIDER || 'mailtrap';
        console.log('📧 All env vars:', {
          EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
          MAILTRAP_USER: process.env.MAILTRAP_USER,
          NODE_ENV: process.env.NODE_ENV
        });
        console.log('📧 Email provider:', emailProvider);

        if (emailProvider === 'outlook' || emailProvider === 'hotmail') {
          this.transporter = nodemailer.createTransport({
            host: 'smtp-mail.outlook.com',
            port: 587,
            secure: false,
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASSWORD
            },
            tls: {
              ciphers: 'SSLv3'
            }
          });
        } else if (emailProvider === 'yahoo') {
          this.transporter = nodemailer.createTransport({
            service: 'yahoo',
            auth: {
              user: process.env.EMAIL_USER, // your_email@yahoo.com
              pass: process.env.EMAIL_PASSWORD // App Password для Yahoo
            }
          });
        } else if (emailProvider === 'gmail') {
          this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASSWORD // App Password для Gmail
            }
          });
        } else if (emailProvider === 'sendgrid') {
          this.transporter = nodemailer.createTransport({
            host: 'smtp.sendgrid.net',
            port: 587,
            secure: false,
            auth: {
              user: 'apikey',
              pass: process.env.SENDGRID_API_KEY
            }
          });
        } else if (emailProvider === 'mailtrap') {
          // Mailtrap для тестування (безкоштовно)
          if (!process.env.MAILTRAP_USER || !process.env.MAILTRAP_PASS) {
            throw new Error('Mailtrap credentials not found in environment variables. Please set MAILTRAP_USER and MAILTRAP_PASS');
          }

          console.log('📧 Using Mailtrap with credentials from env');

          this.transporter = nodemailer.createTransport({
            host: 'sandbox.smtp.mailtrap.io',
            port: 2525,
            auth: {
              user: process.env.MAILTRAP_USER,
              pass: process.env.MAILTRAP_PASS
            }
          });
        } else {
          // Власний SMTP сервер
          this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASSWORD
            }
          });
        }
      }

      // Альтернативна конфігурація для інших SMTP серверів
      // this.transporter = nodemailer.createTransport({
      //   host: process.env.SMTP_HOST,
      //   port: process.env.SMTP_PORT,
      //   secure: false,
      //   auth: {
      //     user: process.env.EMAIL_USER,
      //     pass: process.env.EMAIL_PASSWORD
      //   }
      // });

      console.log('✅ Email service initialized');

      // Перевірка підключення при ініціалізації
      await this.verifyConnection();
    } catch (error) {
      console.error('❌ Email service initialization failed:', error);
    }
  }

  async sendPasswordResetEmail(email, resetToken, username) {
    try {
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password.html?token=${resetToken}`;

      const mailOptions = {
        from: {
          name: 'Survey App',
          address: process.env.EMAIL_USER
        },
        to: email,
        subject: 'Відновлення паролю - Survey App',
        html: this.getPasswordResetTemplate(username, resetUrl, resetToken)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Password reset email sent:', result.messageId);

      // Якщо це тестовий режим, показуємо посилання для перегляду email
      if (process.env.NODE_ENV === 'development' && !process.env.EMAIL_PASSWORD) {
        console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(result));
      }

      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      return { success: false, error: error.message };
    }
  }

  getPasswordResetTemplate(username, resetUrl, resetToken) {
    return `
    <!DOCTYPE html>
    <html lang="uk">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Відновлення паролю</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background-color: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                border-bottom: 2px solid #007bff;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }
            .header h1 {
                color: #007bff;
                margin: 0;
            }
            .content {
                margin-bottom: 30px;
            }
            .button {
                display: inline-block;
                background-color: #007bff;
                color: white;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
                text-align: center;
                margin: 20px 0;
            }
            .button:hover {
                background-color: #0056b3;
            }
            .token-info {
                background-color: #f8f9fa;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
                border-left: 4px solid #007bff;
            }
            .footer {
                border-top: 1px solid #dee2e6;
                padding-top: 20px;
                margin-top: 30px;
                font-size: 12px;
                color: #6c757d;
                text-align: center;
            }
            .warning {
                color: #dc3545;
                font-weight: bold;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔐 Survey App</h1>
                <h2>Відновлення паролю</h2>
            </div>

            <div class="content">
                <p>Привіт, <strong>${username}</strong>!</p>

                <p>Ви запросили відновлення паролю для вашого акаунту в Survey App. Щоб створити новий пароль, натисніть на кнопку нижче:</p>

                <div style="text-align: center;">
                    <a href="${resetUrl}" class="button">Відновити пароль</a>
                </div>

                <div class="token-info">
                    <strong>Альтернативний спосіб:</strong><br>
                    Якщо кнопка не працює, скопіюйте та вставте це посилання в ваш браузер:<br>
                    <a href="${resetUrl}">${resetUrl}</a>
                </div>

                <p class="warning">⚠️ Важливо:</p>
                <ul>
                    <li>Це посилання дійсне протягом <strong>1 години</strong></li>
                    <li>Посилання можна використати тільки один раз</li>
                    <li>Якщо ви не запрошували відновлення паролю, проігноруйте цей лист</li>
                </ul>

                <p>Якщо у вас виникли проблеми, зверніться до служби підтримки.</p>
            </div>

            <div class="footer">
                <p>Цей лист було автоматично згенеровано системою Survey App.<br>
                Будь ласка, не відповідайте на цей лист.</p>
                <p>Код токену: <code>${resetToken.slice(0, 8)}...</code></p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Email service connection verified');
      return true;
    } catch (error) {
      console.error('❌ Email service connection failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();