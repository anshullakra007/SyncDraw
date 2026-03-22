package com.example.sync_draw_backend;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        // We permit all HTTP requests because our WebSocket handshake needs to be open,
        // and we secure the actual STOMP CONNECT frame in WebSocketConfig using a ChannelInterceptor.
        http
            .authorizeHttpRequests(authz -> authz
                .anyRequest().permitAll()
            )
            .csrf(csrf -> csrf.disable()) // Disable CSRF for WebSockets
            .cors(cors -> cors.configure(http));
            
        return http.build();
    }
}
