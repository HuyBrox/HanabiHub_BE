import { Request, Response } from "express";

/**
 * Generate Twilio TURN credentials for WebRTC
 * Twilio TURN servers help establish connections when peer-to-peer fails
 * (e.g., different networks, NAT, firewall issues)
 *
 * Note: Twilio TURN servers require Account SID as username and Auth Token as password
 * For production, consider using Twilio's Network Traversal Service (NTS) API
 * for temporary credentials with better security
 */
export const getTurnCredentials = async (req: Request, res: Response) => {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      return res.status(500).json({
        success: false,
        message: "Twilio credentials not configured",
      });
    }

    // For Twilio TURN servers, we use Account SID as username and Auth Token as password
    // This is acceptable for server-side generation since credentials are sent securely
    // In production, consider using Twilio's NTS API for temporary credentials

    const iceServers = [
      // STUN server (free, for simple NAT traversal)
      {
        urls: "stun:stun.l.google.com:19302",
      },
      // Twilio TURN servers (for complex NAT/firewall scenarios)
      {
        urls: "turn:global.turn.twilio.com:3478?transport=udp",
        username: accountSid,
        credential: authToken,
      },
      {
        urls: "turn:global.turn.twilio.com:3478?transport=tcp",
        username: accountSid,
        credential: authToken,
      },
      {
        urls: "turn:global.turn.twilio.com:443?transport=tcp",
        username: accountSid,
        credential: authToken,
      },
    ];

    return res.status(200).json({
      success: true,
      data: {
        iceServers,
      },
    });
  } catch (error: any) {
    console.error("Error generating TURN credentials:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate TURN credentials",
      error: error.message,
    });
  }
};

