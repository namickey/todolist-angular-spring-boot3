package com.example.demo.webapi;

import java.util.List;
import java.util.Optional;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface TodoMapper {
    List<Todo> findAll();
    Todo findById(@Param("id") Long id);
    int insert(Todo todo);
    int update(Todo todo);
    int delete(@Param("id") Long id);
    int deleteAll();

    default Optional<Todo> findOptional(Long id) {
        return Optional.ofNullable(findById(id));
    }
}
