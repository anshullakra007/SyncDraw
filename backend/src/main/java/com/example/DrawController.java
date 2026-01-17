package com.example.sync_draw_backend; // ⚠️ Corrected Package Name

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
public class DrawController {

    @MessageMapping("/draw")
    @SendTo("/topic/canvas")
    public DrawMessage sendMessage(DrawMessage message) {
        return message;
    }
}