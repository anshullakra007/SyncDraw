package com.example.sync_draw_backend;

public class DrawMessage {
    private double x;
    private double y;
    private double prevX;
    private double prevY;
    private String color;

    // 1. Empty Constructor
    public DrawMessage() {}

    // 2. Full Constructor
    public DrawMessage(double x, double y, double prevX, double prevY, String color) {
        this.x = x;
        this.y = y;
        this.prevX = prevX;
        this.prevY = prevY;
        this.color = color;
    }

    // 3. Getters and Setters
    public double getX() { return x; }
    public void setX(double x) { this.x = x; }

    public double getY() { return y; }
    public void setY(double y) { this.y = y; }

    public double getPrevX() { return prevX; }
    public void setPrevX(double prevX) { this.prevX = prevX; }

    public double getPrevY() { return prevY; }
    public void setPrevY(double prevY) { this.prevY = prevY; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
}