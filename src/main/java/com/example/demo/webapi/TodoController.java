package com.example.demo.webapi;

import java.net.URI;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.Data;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/todos")
@RequiredArgsConstructor
public class TodoController {
    private final TodoService todoService;

    /** 保存されているすべてのTODOを返す。 */
    @GetMapping
    public List<Todo> list() {
        System.out.println("list() called");
        return todoService.findAll();
    }

    /** 指定IDのTODOを取得し、見つからなければ404を返す。 */
    @GetMapping("/{id}")
    public ResponseEntity<Todo> get(@PathVariable Long id) {
        System.out.println("get() called with ID: " + id);
        return todoService.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** タイトルが有効であれば新しいTODOを作成する。 */
    @PostMapping
    public ResponseEntity<Todo> create(@RequestBody CreateTodoRequest req) {
        System.out.println("create() called with title: " + (req != null ? req.getTitle() : "null"));
        if (req == null || req.getTitle() == null || req.getTitle().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        Todo created = todoService.create(req.getTitle());
        return ResponseEntity.created(URI.create("/api/todos/" + created.getId())).body(created);
    }

    /** 指定したTODOが存在すればタイトルや完了状態を更新する。 */
    @PutMapping("/{id}")
    public ResponseEntity<Todo> update(@PathVariable Long id, @RequestBody UpdateTodoRequest req) {
        System.out.println("update() called with ID: " + id + ", title: " + (req != null ? req.getTitle() : "null") + ", completed: " + (req != null ? req.getCompleted() : "null"));
        return todoService.update(id, req.getTitle(), req.getCompleted())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** 指定IDのTODOを削除し、存在しなければ404を返す。 */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        System.out.println("delete() called with ID: " + id);
        boolean removed = todoService.delete(id);
        return removed ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    /** 全てのTODOを無条件に削除する。 */
    @DeleteMapping
    public ResponseEntity<Void> deleteAll() {
        System.out.println("deleteAll() called");
        todoService.deleteAll();
        return ResponseEntity.noContent().build();
    }

    @Data
    public static class CreateTodoRequest {
        private String title;
    }

    @Data
    public static class UpdateTodoRequest {
        private String title;
        private Boolean completed;
    }
}
