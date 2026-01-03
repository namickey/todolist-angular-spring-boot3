package com.example.demo.webapi;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TodoService {
    private final TodoMapper mapper;

    public List<Todo> findAll() {
        return mapper.findAll();
    }

    public Optional<Todo> findById(Long id) {
        System.out.println("Finding Todo with ID: " + id);
        return mapper.findOptional(id);
    }

    public Todo create(String title) {
        LocalDateTime now = LocalDateTime.now();
        Todo todo = Todo.builder()
                .title(title)
                .completed(false)
                .createdAt(now)
                .updatedAt(now)
                .build();
        mapper.insert(todo); // useGeneratedKeys でIDが設定される
        return todo;
    }

    public Optional<Todo> update(Long id, String title, Boolean completed) {
        Todo existing = mapper.findById(id);
        if (existing == null) return Optional.empty();
        if (title != null) existing.setTitle(title);
        if (completed != null) existing.setCompleted(completed);
        existing.setUpdatedAt(LocalDateTime.now());
        mapper.update(existing);
        return Optional.of(existing);
    }

    public boolean delete(Long id) {
        return mapper.delete(id) > 0;
    }

    public void deleteAll() {
        mapper.deleteAll();
    }
}
