package com.example.sync_draw_backend;

public class DrawMessage {
    private int x;
    private int y;
    private int prevX;
    private int prevY;
    private String color;

    // 1. Empty Constructor
    public DrawMessage() {}

    // 2. Full Constructor
    public DrawMessage(int x, int y, int prevX, int prevY, String color) {
        this.x = x;
        this.y = y;
        this.prevX = prevX;
        this.prevY = prevY;
        this.color = color;
    }

    // 3. Getters and Setters
    public int getX() { return x; }
    public void setX(int x) { this.x = x; }

    public int getY() { return y; }
    public void setY(int y) { this.y = y; }

    public int getPrevX() { return prevX; }
    public void setPrevX(int prevX) { this.prevX = prevX; }

    public int getPrevY() { return prevY; }
    public void setPrevY(int prevY) { this.prevY = prevY; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
}