// Telegram Bot Integration Service

export interface TelegramConfig {
  chatId: string;
  enabled: boolean;
  username?: string;
}

// Get Telegram configuration from localStorage
export const getTelegramConfig = (): TelegramConfig | null => {
  if (typeof window === 'undefined') return null;
  
  const config = localStorage.getItem('telegram_config');
  if (!config) return null;
  
  try {
    return JSON.parse(config);
  } catch {
    return null;
  }
};

// Save Telegram configuration
export const saveTelegramConfig = (config: TelegramConfig): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('telegram_config', JSON.stringify(config));
};

// Clear Telegram configuration
export const clearTelegramConfig = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('telegram_config');
};

// Format alert message for Telegram
export const formatTelegramAlert = (alert: any): string => {
  const icon = getAlertIcon(alert.type);
  const timestamp = new Date().toLocaleTimeString();
  
  let message = `${icon} *STELLAR GUARD ALERT*\n\n`;
  message += `⚡ *Type:* ${alert.type.toUpperCase().replace('_', ' ')}\n`;
  message += `🪙 *Asset:* ${alert.asset}\n`;
  
  if (alert.threshold) {
    message += `🎯 *Threshold:* $${alert.threshold}\n`;
  }
  
  if (alert.currentValue) {
    message += `📊 *Current:* $${alert.currentValue}\n`;
  }
  
  if (alert.message) {
    message += `\n📝 *Details:* ${alert.message}\n`;
  }
  
  message += `\n⏰ *Time:* ${timestamp}\n`;
  message += `\n[View Dashboard](${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/alerts)`;
  
  return message;
};

// Get emoji icon for alert type
const getAlertIcon = (type: string): string => {
  switch (type) {
    case 'price_above': return '📈';
    case 'price_below': return '📉';
    case 'stablecoin_peg': return '⚠️';
    case 'arbitrage': return '💰';
    case 'volatility': return '🌊';
    case 'stop_loss': return '🛑';
    case 'liquidation': return '⚡';
    default: return '🔔';
  }
};

// Send message via Telegram Bot API
export const sendTelegramMessage = async (
  chatId: string,
  message: string
): Promise<boolean> => {
  try {
    const botToken = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
      console.error('Telegram bot token not configured');
      return false;
    }
    
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
      }),
    });
    
    const result = await response.json();
    
    if (!result.ok) {
      console.error('Telegram API error:', result);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return false;
  }
};

// Send alert to Telegram if enabled
export const sendTelegramAlert = async (alert: any): Promise<boolean> => {
  const config = getTelegramConfig();
  
  if (!config || !config.enabled || !config.chatId) {
    return false;
  }
  
  const message = formatTelegramAlert(alert);
  return await sendTelegramMessage(config.chatId, message);
};

// Verify Telegram chat ID by sending test message
export const verifyTelegramChatId = async (chatId: string): Promise<boolean> => {
  const testMessage = `✅ *STELLAR GUARD*\n\nYour Telegram alerts are now connected!\n\nYou will receive notifications when your alerts trigger.\n\n🛡️ _Protecting your assets 24/7_`;
  
  const success = await sendTelegramMessage(chatId, testMessage);
  
  if (success) {
    // Save config if verification successful
    saveTelegramConfig({
      chatId,
      enabled: true,
    });
  }
  
  return success;
};

// Get bot username from environment
export const getTelegramBotUsername = (): string => {
  return process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'StellarGuardBot';
};

// Generate connection instructions
export const getTelegramInstructions = (): string[] => {
  const botUsername = getTelegramBotUsername();
  
  return [
    `1. Open Telegram and search for @${botUsername}`,
    `2. Start a chat with the bot by clicking "START"`,
    `3. Send the command /start to get your Chat ID`,
    `4. Copy your Chat ID and paste it below`,
    `5. Click "Verify & Connect" to complete setup`,
  ];
};